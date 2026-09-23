import { themeColor } from "@domphy/theme";
import type { Buffer, Device, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import {
  applyItemState,
  type ItemStateResolver,
  NO_ITEM_STATES,
} from "../itemStates.js";
import type { RadarOption, RadarSeriesOption } from "../types.js";
import type { ColorResolver } from "./color.js";
import { AREA_FS, AREA_VS } from "./shaders/line.glsl.js";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

export interface RadarPolygonLayout {
  seriesIndex: number;
  dataIndex: number;
  polygon: [number, number][];
  cx: number;
  cy: number;
}

// Geometry only — one polygon per radar shape (ECharts: series-radar.data[i]
// is a full shape, addressed by dataIndex). render() below draws from this;
// hitTestRadarItem() in engine.ts point-in-polygon tests against the SAME
// output, so a hover/click can never land on a vertex set the renderer did
// not actually paint.
export function computeRadarPolygons(
  radarSeries: RadarSeriesOption[],
  radars: RadarOption[],
  width: number,
  height: number,
): RadarPolygonLayout[] {
  const result: RadarPolygonLayout[] = [];
  for (let si = 0; si < radarSeries.length; si++) {
    const s = radarSeries[si];
    const radar = radars[s.radarIndex ?? 0];
    if (!radar) continue;

    const minSize = Math.min(width, height);
    const cx = radar.center
      ? typeof radar.center[0] === "number"
        ? radar.center[0]
        : (parseFloat(radar.center[0]) / 100) * width
      : width / 2;
    const cy = radar.center
      ? typeof radar.center[1] === "number"
        ? radar.center[1]
        : (parseFloat(radar.center[1]) / 100) * height
      : height / 2;
    const radius = radar.radius
      ? typeof radar.radius === "number"
        ? radar.radius
        : (parseFloat(radar.radius as string) / 100) * minSize
      : minSize * 0.35;
    const startAngle = ((radar.startAngle ?? 90) * Math.PI) / 180;
    const indicators = radar.indicator;
    const count = indicators.length;
    const sharingRadar = radarSeries.filter(
      (other) => (other.radarIndex ?? 0) === (s.radarIndex ?? 0),
    );
    const axisMax = indicators.map((ind, axisIndex) => {
      const min = ind.min ?? 0;
      if (Number.isFinite(ind.max) && (ind.max as number) > min)
        return ind.max as number;
      let derived = -Infinity;
      for (const sibling of sharingRadar) {
        for (const item of sibling.data ?? []) {
          const candidate = (item.value ?? [])[axisIndex];
          if (Number.isFinite(candidate))
            derived = Math.max(derived, candidate as number);
        }
      }
      return derived > min ? derived : min + 1;
    });

    for (let di = 0; di < (s.data ?? []).length; di++) {
      const dataItem = (s.data ?? [])[di];
      const values = dataItem.value ?? [];
      const polygon: [number, number][] = [];
      for (let i = 0; i < count; i++) {
        const ind = indicators[i];
        const min = ind.min ?? 0;
        const raw = values[i];
        const value = Number.isFinite(raw) ? (raw as number) : min;
        const fraction = Math.max(
          0,
          Math.min(1, (value - min) / (axisMax[i] - min)),
        );
        const angle = startAngle - (2 * Math.PI * i) / count;
        polygon.push([
          cx + radius * fraction * Math.cos(angle),
          cy - radius * fraction * Math.sin(angle),
        ]);
      }
      result.push({ seriesIndex: si, dataIndex: di, polygon, cx, cy });
    }
  }
  return result;
}

/** Even-odd point-in-polygon test (ray casting), for radar hit-testing. */
export function pointInPolygon(
  px: number,
  py: number,
  polygon: readonly (readonly [number, number])[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export class RadarRenderer {
  private device: Device;
  private model: Model | null = null;
  private buffers: Buffer[] = [];

  constructor(device: Device) {
    this.device = device;
  }

  private ensureModel(): Model {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: AREA_VS,
      fs: AREA_FS,
      topology: "triangle-list",
      bufferLayout: [{ name: "aPosition", format: "float32x2" }],
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

  renderGridToSvg(
    svg: SVGSVGElement,
    radar: RadarOption,
    width: number,
    height: number,
  ): void {
    const old = svg.querySelector(".dc-radar-grid");
    if (old) old.remove();

    const minSize = Math.min(width, height);
    const cx = radar.center
      ? typeof radar.center[0] === "number"
        ? radar.center[0]
        : (parseFloat(radar.center[0]) / 100) * width
      : width / 2;
    const cy = radar.center
      ? typeof radar.center[1] === "number"
        ? radar.center[1]
        : (parseFloat(radar.center[1]) / 100) * height
      : height / 2;
    const radius = radar.radius
      ? typeof radar.radius === "number"
        ? radar.radius
        : (parseFloat(radar.radius as string) / 100) * minSize
      : minSize * 0.35;

    const indicators = radar.indicator;
    const count = indicators.length;
    const splitNum = radar.splitNumber ?? 5;
    const startAngle = ((radar.startAngle ?? 90) * Math.PI) / 180;
    const isCircle = radar.shape === "circle";
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dc-radar-grid");

    const spoke = (i: number, fraction = 1): [number, number] => {
      const angle = startAngle - (2 * Math.PI * i) / count;
      return [
        cx + radius * fraction * Math.cos(angle),
        cy - radius * fraction * Math.sin(angle),
      ];
    };

    const gridColor = themeColor(null, "shift-2", "neutral");
    const textColor = themeColor(null, "shift-7", "neutral");

    for (let level = 1; level <= splitNum; level++) {
      const fraction = level / splitNum;
      if (isCircle) {
        const circle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", String(radius * fraction));
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", gridColor);
        circle.setAttribute("stroke-width", "1");
        group.appendChild(circle);
      } else {
        const points = indicators
          .map((_, i) => spoke(i, fraction).join(","))
          .join(" ");
        const poly = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon",
        );
        poly.setAttribute("points", points);
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", gridColor);
        poly.setAttribute("stroke-width", "1");
        group.appendChild(poly);
      }
    }

    for (let i = 0; i < count; i++) {
      const [sx, sy] = spoke(i);
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", String(cx));
      line.setAttribute("y1", String(cy));
      line.setAttribute("x2", String(sx));
      line.setAttribute("y2", String(sy));
      line.setAttribute("stroke", gridColor);
      line.setAttribute("stroke-width", "1");
      group.appendChild(line);
    }

    indicators.forEach((ind, i) => {
      const [sx, sy] = spoke(i);
      const dx = sx - cx;
      const dy = sy - cy;
      const len = Math.hypot(dx, dy) || 1;
      const lx = sx + (dx / len) * 14;
      const ly = sy + (dy / len) * 14;
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.textContent = ind.name ?? "";
      text.setAttribute("x", String(lx));
      text.setAttribute("y", String(ly));
      text.setAttribute("font-size", "11");
      text.setAttribute("fill", textColor);
      text.setAttribute(
        "text-anchor",
        lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle",
      );
      text.setAttribute(
        "dominant-baseline",
        ly > cy + 4 ? "hanging" : ly < cy - 4 ? "auto" : "middle",
      );
      group.appendChild(text);
    });

    svg.appendChild(group);
  }

  render(
    renderPass: RenderPass,
    radarSeries: RadarSeriesOption[],
    radars: RadarOption[],
    width: number,
    height: number,
    seriesOffset: number,
    color: ColorResolver,
    states: ItemStateResolver = NO_ITEM_STATES,
  ): void {
    if (radarSeries.length === 0) return;
    const model = this.ensureModel();

    for (const b of this.buffers) b.destroy();
    this.buffers = [];

    // Geometry (center/radius/axis-max derivation, one polygon per shape)
    // lives in one place — computeRadarPolygons() above — shared with
    // engine.ts's hitTestRadarItem(), so a hover/click can never land on a
    // different polygon than what is actually drawn here.
    const layouts = computeRadarPolygons(radarSeries, radars, width, height);
    for (const { seriesIndex: si, dataIndex: di, polygon, cx, cy } of layouts) {
      const s = radarSeries[si];
      const dataItem = (s.data ?? [])[di];
      const paletteIndex = seriesOffset + si + di;
      const baseColor = color.rgba(
        (dataItem as any).lineStyle?.color ?? s.color,
        paletteIndex,
      );
      // Radar's `data` array holds one polygon per shape (ECharts:
      // series-radar.data[dataIndex] is one full shape) — `di` is that
      // shape's dataIndex, the same unit emphasis/blur/select address.
      const polygonColor = applyItemState(
        baseColor,
        states(s, di),
        color,
        paletteIndex,
      );

      const count = polygon.length;
      const fillVerts: number[] = [];
      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        fillVerts.push(
          cx,
          cy,
          polygon[i][0],
          polygon[i][1],
          polygon[next][0],
          polygon[next][1],
        );
      }
      const areaColor = [
        polygonColor[0],
        polygonColor[1],
        polygonColor[2],
        polygonColor[3] * ((s.areaStyle?.opacity as number) ?? 0.35),
      ];
      const fillBuffer = this.device.createBuffer({
        data: new Float32Array(fillVerts),
        id: "radar-fill",
      });
      this.buffers.push(fillBuffer);
      model.setAttributes({ aPosition: fillBuffer });
      model.setVertexCount(fillVerts.length / 2);
      setUniforms(model, { uResolution: [width, height], uColor: areaColor });
      model.draw(renderPass);

      const lineVerts: number[] = [];
      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        const [x0, y0] = polygon[i];
        const [x1, y1] = polygon[next];
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const nx = -(y1 - y0) / len;
        const ny = (x1 - x0) / len;
        const hw = 1;
        lineVerts.push(
          x0 + nx * hw,
          y0 + ny * hw,
          x1 + nx * hw,
          y1 + ny * hw,
          x0 - nx * hw,
          y0 - ny * hw,
          x1 + nx * hw,
          y1 + ny * hw,
          x1 - nx * hw,
          y1 - ny * hw,
          x0 - nx * hw,
          y0 - ny * hw,
        );
      }
      const lineBuffer = this.device.createBuffer({
        data: new Float32Array(lineVerts),
        id: "radar-line",
      });
      this.buffers.push(lineBuffer);
      model.setAttributes({ aPosition: lineBuffer });
      model.setVertexCount(lineVerts.length / 2);
      setUniforms(model, {
        uResolution: [width, height],
        uColor: polygonColor,
      });
      model.draw(renderPass);
    }
  }

  destroy(): void {
    this.model?.destroy();
    for (const b of this.buffers) b.destroy();
  }
}
