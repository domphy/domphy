import type { Buffer, Device, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import { layoutBarSeries } from "../coord/barPositions.js";
import {
  applyItemState,
  type ItemStateResolver,
  NO_ITEM_STATES,
} from "../itemStates.js";
import type { AnyScale } from "../scale/index.js";
import type { BarSeriesOption, ChartRect } from "../types.js";
import type { ColorResolver } from "./color.js";
import { BAR_FS, BAR_VS } from "./shaders/bar.glsl.js";

// instanceRect(4) + instanceColor(4) + instanceRadius(1) — matches the
// bufferLayout byteStride of 36 below.
const BAR_STRIDE = 9;

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

export class BarRenderer {
  private device: Device;
  private model: Model | null = null;
  private quadVbo: Buffer | null = null;
  private instanceBuffers: Buffer[] = [];

  constructor(device: Device) {
    this.device = device;
  }

  private ensureModel(): Model {
    if (this.model) return this.model;
    const quadVerts = new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]);
    this.quadVbo = this.device.createBuffer({
      data: quadVerts,
      id: "bar-quad",
    });
    this.model = new Model(this.device, {
      vs: BAR_VS,
      fs: BAR_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "position", format: "float32x2" },
        {
          name: "instanceData",
          stepMode: "instance",
          byteStride: 36,
          attributes: [
            { attribute: "instanceRect", format: "float32x4", byteOffset: 0 },
            { attribute: "instanceColor", format: "float32x4", byteOffset: 16 },
            { attribute: "instanceRadius", format: "float32", byteOffset: 32 },
          ],
        },
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
    series: BarSeriesOption[],
    xScales: AnyScale[],
    yScales: AnyScale[],
    _gridRect: ChartRect,
    width: number,
    height: number,
    seriesOffset: number,
    color: ColorResolver,
    states: ItemStateResolver = NO_ITEM_STATES,
  ): void {
    if (series.length === 0) return;
    const model = this.ensureModel();

    // One place resolves a bar's fill: the datum's own itemStyle.color if it
    // has one, otherwise the series colour, and then the emphasis/blur/select
    // delta for that datum. Resolving the item colour through the pass's
    // ColorResolver (not hexToRgba) also lets a data item carry a theme family
    // or a var(--…) reference, like every other colour in the option.
    const fillOf = (
      s: BarSeriesOption,
      item: unknown,
      dataIndex: number,
      seriesColorRgba: readonly number[],
      paletteIndex: number,
    ): readonly number[] => {
      const itemColor = (item as { itemStyle?: { color?: unknown } } | null)
        ?.itemStyle?.color;
      const base = itemColor
        ? color.rgba(itemColor, paletteIndex)
        : seriesColorRgba;
      return applyItemState(
        base as [number, number, number, number],
        states(s, dataIndex),
        color,
        paletteIndex,
      );
    };

    for (const b of this.instanceBuffers) b.destroy();
    this.instanceBuffers = [];

    const allInstances: number[] = [];
    let barCount = 0;
    const barRadius = 2;

    // Geometry (grouping/stacking, both orientations) lives in one place —
    // coord/barPositions.ts — shared with overlay/brush.ts's hit-testing, so
    // a brush selection can never land on a different rect than what is
    // actually drawn here.
    const positions = layoutBarSeries(series, xScales, yScales);
    series.forEach((s, seriesIndex) => {
      const rects = positions.get(seriesIndex);
      if (!rects) return;
      const paletteIndex = seriesOffset + seriesIndex;
      const barColor = color.rgba(s.color, paletteIndex);
      const data = s.data ?? [];
      rects.forEach((rect, dataIndex) => {
        if (!rect) return;
        const item = data[dataIndex];
        const c = fillOf(s, item, dataIndex, barColor, paletteIndex);
        allInstances.push(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          c[0],
          c[1],
          c[2],
          c[3],
          barRadius,
        );
        barCount++;
      });
    });

    if (barCount === 0) return;

    // Drop any instance that carries a non-finite float. NaN data, and values a
    // log scale cannot place (map() returns NaN for value <= 0), otherwise
    // reach the vertex buffer as undefined rasterizer input. Filtering the
    // assembled stride once covers all four push sites above.
    let finiteCount = barCount;
    let instanceData = allInstances;
    if (allInstances.some((v) => !Number.isFinite(v))) {
      // Copied element by element, never `push(...kept)`: spreading an array
      // of a few hundred thousand floats (a large dataset carrying one NaN)
      // exceeds the argument limit and throws RangeError.
      const kept: number[] = [];
      for (let base = 0; base < allInstances.length; base += BAR_STRIDE) {
        let finite = true;
        for (let offset = 0; offset < BAR_STRIDE; offset++) {
          if (!Number.isFinite(allInstances[base + offset])) {
            finite = false;
            break;
          }
        }
        if (!finite) continue;
        for (let offset = 0; offset < BAR_STRIDE; offset++)
          kept.push(allInstances[base + offset]);
      }
      instanceData = kept;
      finiteCount = kept.length / BAR_STRIDE;
      if (finiteCount === 0) return;
    }

    const instanceBuffer = this.device.createBuffer({
      data: new Float32Array(instanceData),
      id: "bar-instances",
    });
    this.instanceBuffers.push(instanceBuffer);

    model.setAttributes({
      position: this.quadVbo!,
      instanceData: instanceBuffer,
    });
    model.setVertexCount(6);
    model.setInstanceCount(finiteCount);
    setUniforms(model, { uResolution: [width, height] });
    model.draw(renderPass);
  }

  destroy(): void {
    this.model?.destroy();
    this.quadVbo?.destroy();
    for (const b of this.instanceBuffers) b.destroy();
  }
}
