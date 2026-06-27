import type { Device, Buffer, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import { HEATMAP_VS, HEATMAP_FS } from "./shaders/heatmap.glsl.js";
import type { HeatmapSeriesOption } from "../types.js";
import type { AnyScale } from "../scale/index.js";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [0.14, 0.55, 0.92]],
  [0.25, [0.00, 0.80, 0.80]],
  [0.5, [0.20, 0.80, 0.20]],
  [0.75, [1.00, 0.85, 0.00]],
  [1.0, [0.92, 0.17, 0.17]],
];

function gradient(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const f = (clamped - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
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
  ): void {
    if (series.length === 0) return;
    const model = this.ensureModel();

    for (const b of this.buffers) b.destroy();
    this.buffers = [];

    for (const s of series) {
      if (s.coordinateSystem !== undefined && s.coordinateSystem !== "cartesian2d") continue;
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;

      const data = (s.data ?? []) as [number, number, number][];
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (const [, , v] of data) {
        if (typeof v === "number") { minVal = Math.min(minVal, v); maxVal = Math.max(maxVal, v); }
      }
      if (!Number.isFinite(minVal)) { minVal = 0; maxVal = 1; }
      const valSpan = maxVal - minVal || 1;

      const bw = xScale.bandwidth() || 20;
      const bh = Math.abs(yScale.bandwidth ? yScale.bandwidth() : 20) || 20;
      const halfW = bw / 2;
      const halfH = bh / 2;

      const positions: number[] = [];
      const colors: number[] = [];

      for (const [xVal, yVal, value] of data) {
        const px = xScale.map(xVal);
        const py = yScale.map(yVal);
        const t = (value - minVal) / valSpan;
        const [r, g, b] = gradient(t);
        positions.push(
          px - halfW, py - halfH,  px + halfW, py - halfH,  px - halfW, py + halfH,
          px + halfW, py - halfH,  px + halfW, py + halfH,  px - halfW, py + halfH,
        );
        for (let vertex = 0; vertex < 6; vertex++) colors.push(r, g, b, 0.85);
      }

      if (positions.length === 0) continue;

      const posBuffer = this.device.createBuffer({ data: new Float32Array(positions), id: "heatmap-pos" });
      const colorBuffer = this.device.createBuffer({ data: new Float32Array(colors), id: "heatmap-color" });
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
