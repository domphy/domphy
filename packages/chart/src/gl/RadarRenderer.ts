import type { Device, Buffer, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import { AREA_VS, AREA_FS } from "./shaders/line.glsl.js";
import type { RadarSeriesOption, RadarOption } from "../types.js";
import { seriesRgba, familyRgba } from "./color.js";
import { themeColorToken } from "@domphy/theme";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
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

  renderGridToSvg(svg: SVGSVGElement, radar: RadarOption, width: number, height: number): void {
    const old = svg.querySelector(".dc-radar-grid");
    if (old) old.remove();

    const minSize = Math.min(width, height);
    const cx = radar.center
      ? (typeof radar.center[0] === "number" ? radar.center[0] : (parseFloat(radar.center[0]) / 100) * width)
      : width / 2;
    const cy = radar.center
      ? (typeof radar.center[1] === "number" ? radar.center[1] : (parseFloat(radar.center[1]) / 100) * height)
      : height / 2;
    const radius = radar.radius
      ? (typeof radar.radius === "number" ? radar.radius : (parseFloat(radar.radius as string) / 100) * minSize)
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
      return [cx + radius * fraction * Math.cos(angle), cy - radius * fraction * Math.sin(angle)];
    };

    const gridColor = themeColorToken(null, "shift-2", "neutral");
    const textColor = themeColorToken(null, "shift-7", "neutral");

    for (let level = 1; level <= splitNum; level++) {
      const fraction = level / splitNum;
      if (isCircle) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", String(radius * fraction));
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", gridColor);
        circle.setAttribute("stroke-width", "1");
        group.appendChild(circle);
      } else {
        const points = indicators.map((_, i) => spoke(i, fraction).join(",")).join(" ");
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", points);
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", gridColor);
        poly.setAttribute("stroke-width", "1");
        group.appendChild(poly);
      }
    }

    for (let i = 0; i < count; i++) {
      const [sx, sy] = spoke(i);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
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
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.textContent = ind.name ?? "";
      text.setAttribute("x", String(lx));
      text.setAttribute("y", String(ly));
      text.setAttribute("font-size", "11");
      text.setAttribute("fill", textColor);
      text.setAttribute("text-anchor", lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle");
      text.setAttribute("dominant-baseline", ly > cy + 4 ? "hanging" : ly < cy - 4 ? "auto" : "middle");
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
  ): void {
    if (radarSeries.length === 0) return;
    const model = this.ensureModel();

    for (const b of this.buffers) b.destroy();
    this.buffers = [];

    for (let si = 0; si < radarSeries.length; si++) {
      const s = radarSeries[si];
      const radar = radars[s.radarIndex ?? 0];
      if (!radar) continue;

      const minSize = Math.min(width, height);
      const cx = radar.center ? (typeof radar.center[0] === "number" ? radar.center[0] : (parseFloat(radar.center[0]) / 100) * width) : width / 2;
      const cy = radar.center ? (typeof radar.center[1] === "number" ? radar.center[1] : (parseFloat(radar.center[1]) / 100) * height) : height / 2;
      const radius = radar.radius ? (typeof radar.radius === "number" ? radar.radius : (parseFloat(radar.radius as string) / 100) * minSize) : minSize * 0.35;
      const startAngle = ((radar.startAngle ?? 90) * Math.PI) / 180;
      const indicators = radar.indicator;
      const count = indicators.length;
      const color = s.color ? familyRgba(s.color as any, "shift-9") : seriesRgba(seriesOffset + si);

      for (const dataItem of (s.data ?? [])) {
        const values = dataItem.value ?? [];
        const polygon: [number, number][] = [];

        for (let i = 0; i < count; i++) {
          const ind = indicators[i];
          const fraction = Math.max(0, Math.min(1, ((values[i] ?? 0) - (ind.min ?? 0)) / (ind.max - (ind.min ?? 0))));
          const angle = startAngle - (2 * Math.PI * i) / count;
          polygon.push([cx + radius * fraction * Math.cos(angle), cy - radius * fraction * Math.sin(angle)]);
        }

        const fillVerts: number[] = [];
        for (let i = 0; i < count; i++) {
          const next = (i + 1) % count;
          fillVerts.push(cx, cy, polygon[i][0], polygon[i][1], polygon[next][0], polygon[next][1]);
        }
        const areaColor = [color[0], color[1], color[2], color[3] * ((s.areaStyle?.opacity as number) ?? 0.35)];
        const fillBuffer = this.device.createBuffer({ data: new Float32Array(fillVerts), id: "radar-fill" });
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
            x0 + nx * hw, y0 + ny * hw, x1 + nx * hw, y1 + ny * hw, x0 - nx * hw, y0 - ny * hw,
            x1 + nx * hw, y1 + ny * hw, x1 - nx * hw, y1 - ny * hw, x0 - nx * hw, y0 - ny * hw,
          );
        }
        const lineBuffer = this.device.createBuffer({ data: new Float32Array(lineVerts), id: "radar-line" });
        this.buffers.push(lineBuffer);
        model.setAttributes({ aPosition: lineBuffer });
        model.setVertexCount(lineVerts.length / 2);
        setUniforms(model, { uResolution: [width, height], uColor: color });
        model.draw(renderPass);
      }
    }
  }

  destroy(): void {
    this.model?.destroy();
    for (const b of this.buffers) b.destroy();
  }
}
