import type { Buffer, Device, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import {
  applyItemState,
  type ItemStateResolver,
  NO_ITEM_STATES,
} from "../itemStates.js";
import { visualMapRgb } from "../overlay/visualmap.js";
import type { AnyScale } from "../scale/index.js";
import type { HeatmapSeriesOption, VisualMapOption } from "../types.js";
import type { ColorResolver } from "./color.js";
import { resolveColorSrc } from "./color.js";
import { HEATMAP_FS, HEATMAP_VS } from "./shaders/heatmap.glsl.js";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [0.14, 0.55, 0.92]],
  [0.25, [0.0, 0.8, 0.8]],
  [0.5, [0.2, 0.8, 0.2]],
  [0.75, [1.0, 0.85, 0.0]],
  [1.0, [0.92, 0.17, 0.17]],
];

// Inherited from this renderer's previous hardcoded vertex alpha (0.85): cells
// stay slightly translucent so grid lines under them remain visible. Kept as
// the default for itemStyle.opacity.
const DEFAULT_CELL_OPACITY = 0.85;
// ECharts' global itemStyle.borderColor default, used when borderWidth is set
// without a borderColor.
const DEFAULT_BORDER_COLOR = "#000";

// Pushes the two triangles of an axis-aligned rect, plus one color per vertex.
function pushQuad(
  positions: number[],
  colors: number[],
  left: number,
  top: number,
  right: number,
  bottom: number,
  color: [number, number, number, number],
): void {
  positions.push(
    left,
    top,
    right,
    top,
    left,
    bottom,
    right,
    top,
    right,
    bottom,
    left,
    bottom,
  );
  for (let vertex = 0; vertex < 6; vertex++)
    colors.push(color[0], color[1], color[2], color[3]);
}

function gradient(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const f = (clamped - t0) / (t1 - t0);
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export class HeatmapRenderer {
  private device: Device;
  private model: Model | null = null;
  private buffers: Buffer[] = [];

  constructor(device: Device) {
    this.device = device;
  }

  private ensureModel(): Model {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: HEATMAP_VS,
      fs: HEATMAP_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "aPosition", format: "float32x2" },
        { name: "aColor", format: "float32x4" },
      ],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha",
      },
    });
    return this.model;
  }

  render(
    renderPass: RenderPass,
    series: HeatmapSeriesOption[],
    xScales: AnyScale[],
    yScales: AnyScale[],
    width: number,
    height: number,
    // The visualMap that targets each series, positionally (engine.ts resolves
    // it through visualMapForSeries). ECharts colours a heatmap cell from the
    // visualMap when there is one; the built-in gradient is the fallback.
    visualMaps: (VisualMapOption | undefined)[] = [],
    color: ColorResolver | null = null,
    states: ItemStateResolver = NO_ITEM_STATES,
    seriesOffset = 0,
  ): void {
    if (series.length === 0) return;
    const model = this.ensureModel();

    for (const b of this.buffers) b.destroy();
    this.buffers = [];

    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const s = series[seriesIndex];
      const visualMap = visualMaps[seriesIndex];
      if (
        s.coordinateSystem !== undefined &&
        s.coordinateSystem !== "cartesian2d"
      )
        continue;
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;

      const data = (s.data ?? []) as [number, number, number][];
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (const [, , v] of data) {
        // Number.isFinite, not typeof: a single NaN cell poisoned min/max,
        // which made valSpan NaN and painted EVERY cell the top gradient stop.
        if (Number.isFinite(v)) {
          minVal = Math.min(minVal, v);
          maxVal = Math.max(maxVal, v);
        }
      }
      if (!Number.isFinite(minVal)) {
        minVal = 0;
        maxVal = 1;
      }
      // ECharts: visualMap.min/max override the data extent, and the legend
      // overlay draws its ramp from exactly these numbers — reading the data
      // extent here instead made the cells and the legend disagree.
      if (Number.isFinite(visualMap?.min)) minVal = visualMap?.min as number;
      if (Number.isFinite(visualMap?.max)) maxVal = visualMap?.max as number;
      const valSpan = maxVal - minVal || 1;

      const bw = xScale.bandwidth() || 20;
      const bh = Math.abs(yScale.bandwidth ? yScale.bandwidth() : 20) || 20;
      const halfW = bw / 2;
      const halfH = bh / 2;

      const itemStyle = s.itemStyle ?? {};
      const cellOpacity = Number.isFinite(itemStyle.opacity)
        ? Math.max(0, Math.min(1, itemStyle.opacity as number))
        : DEFAULT_CELL_OPACITY;
      // ECharts draws a border around each cell. In a triangle-list renderer
      // the cheap equivalent is four border strips plus the fill inset by
      // borderWidth — no extra draw call, no stroke geometry. Clamped to half
      // the cell so a wide border cannot invert the inset rect.
      const borderWidth = Number.isFinite(itemStyle.borderWidth)
        ? Math.max(0, Math.min(halfW, halfH, itemStyle.borderWidth as number))
        : 0;
      const borderColor = resolveColorSrc(
        itemStyle.borderColor ?? DEFAULT_BORDER_COLOR,
        [0, 0, 0, 1],
      );
      const borderRgba: [number, number, number, number] = [
        borderColor[0],
        borderColor[1],
        borderColor[2],
        borderColor[3] * cellOpacity,
      ];

      const positions: number[] = [];
      const colors: number[] = [];

      data.forEach(([xVal, yVal, value], dataIndex) => {
        // A cell with no value is a hole, not a zero — ECharts leaves it
        // blank. Drawing it painted a full-intensity cell over empty data.
        if (!Number.isFinite(value)) return;
        const px = xScale.map(xVal);
        const py = yScale.map(yVal);
        if (!Number.isFinite(px) || !Number.isFinite(py)) return;
        const mapped = visualMap
          ? visualMapRgb(visualMap, value, [minVal, maxVal])
          : gradient((value - minVal) / valSpan);
        // null = out of the visualMap's range with no outOfRange colour, i.e.
        // ECharts' default rgba(0,0,0,0): the cell is not drawn.
        if (!mapped) return;
        const paletteIndex = seriesOffset + seriesIndex;
        const cellRgba: [number, number, number, number] = color
          ? applyItemState(
              [mapped[0], mapped[1], mapped[2], cellOpacity],
              states(s, dataIndex),
              color,
              paletteIndex,
            )
          : [mapped[0], mapped[1], mapped[2], cellOpacity];
        const [r, g, b] = cellRgba;
        const left = px - halfW;
        const right = px + halfW;
        const top = py - halfH;
        const bottom = py + halfH;
        const innerTop = top + borderWidth;
        const innerBottom = bottom - borderWidth;
        if (borderWidth > 0) {
          // Four non-overlapping strips, not a full quad under the fill: cells
          // are translucent by default, so a border quad showing through would
          // tint every cell's interior instead of only its edge.
          pushQuad(positions, colors, left, top, right, innerTop, borderRgba);
          pushQuad(
            positions,
            colors,
            left,
            innerBottom,
            right,
            bottom,
            borderRgba,
          );
          pushQuad(
            positions,
            colors,
            left,
            innerTop,
            left + borderWidth,
            innerBottom,
            borderRgba,
          );
          pushQuad(
            positions,
            colors,
            right - borderWidth,
            innerTop,
            right,
            innerBottom,
            borderRgba,
          );
        }
        pushQuad(
          positions,
          colors,
          left + borderWidth,
          innerTop,
          right - borderWidth,
          innerBottom,
          [r, g, b, cellRgba[3]],
        );
      });

      if (positions.length === 0) continue;

      const posBuffer = this.device.createBuffer({
        data: new Float32Array(positions),
        id: "heatmap-pos",
      });
      const colorBuffer = this.device.createBuffer({
        data: new Float32Array(colors),
        id: "heatmap-color",
      });
      this.buffers.push(posBuffer, colorBuffer);

      model.setAttributes({ aPosition: posBuffer, aColor: colorBuffer });
      model.setVertexCount(positions.length / 2);
      setUniforms(model, { uResolution: [width, height] });
      model.draw(renderPass);
    }
  }

  destroy(): void {
    this.model?.destroy();
    for (const b of this.buffers) b.destroy();
  }
}
