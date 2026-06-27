import type { Device, Buffer, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import { SCATTER_VS, SCATTER_FS } from "./shaders/scatter.glsl.js";
import type { ScatterSeriesOption, ChartRect } from "../types.js";
import type { AnyScale } from "../scale/index.js";
import { seriesRgba, familyRgba } from "./color.js";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

export class ScatterRenderer {
  private device: Device;
  private model: Model | null = null;
  private buffers: Buffer[] = [];

  constructor(device: Device) {
    this.device = device;
  }

  private ensureModel(): Model {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: SCATTER_VS,
      fs: SCATTER_FS,
      topology: "triangle-list",
      bufferLayout: [
        {
          name: "instanceData",
          stepMode: "instance",
          attributes: [
            { attribute: "aPosition", format: "float32x2", byteOffset: 0 },
            { attribute: "aRadius", format: "float32", byteOffset: 8 },
            { attribute: "aColor", format: "float32x4", byteOffset: 12 },
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
    series: ScatterSeriesOption[],
    xScales: AnyScale[],
    yScales: AnyScale[],
    _gridRect: ChartRect,
    width: number,
    height: number,
    seriesOffset: number,
  ): void {
    if (series.length === 0) return;
    const model = this.ensureModel();

    for (const b of this.buffers) b.destroy();
    this.buffers = [];

    // 7 floats per instance: x, y, radius, r, g, b, a
    const allInstances: number[] = [];
    let pointCount = 0;

    for (let index = 0; index < series.length; index++) {
      const s = series[index];
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;

      const baseColor = s.color ? familyRgba(s.color as any, "shift-9") : seriesRgba(seriesOffset + index);
      const defaultRadius = typeof s.symbolSize === "number" ? s.symbolSize / 2 : 5;
      const data = s.data ?? [];

      for (let di = 0; di < data.length; di++) {
        const item = data[di];
        let xVal: any;
        let yVal: number;
        let radius = defaultRadius;

        if (Array.isArray(item)) {
          xVal = item[0]; yVal = item[1] as number;
          if (item[2] !== undefined) radius = (item[2] as number) / 2;
        } else if (typeof item === "number") {
          xVal = di; yVal = item;
        } else if (item && typeof item === "object") {
          const raw = (item as any).value;
          if (Array.isArray(raw)) { xVal = raw[0]; yVal = raw[1]; if (raw[2] !== undefined) radius = raw[2] / 2; }
          else { xVal = di; yVal = raw; }
          if ((item as any).symbolSize) radius = (item as any).symbolSize / 2;
        } else {
          continue;
        }

        if (typeof s.symbolSize === "function") radius = (s.symbolSize as any)(item, { dataIndex: di }) / 2;

        allInstances.push(xScale.map(xVal), yScale.map(yVal), radius, ...baseColor);
        pointCount++;
      }
    }

    if (pointCount === 0) return;

    const instanceBuffer = this.device.createBuffer({ data: new Float32Array(allInstances), id: "scatter-instances" });
    this.buffers.push(instanceBuffer);

    model.setAttributes({ instanceData: instanceBuffer });
    model.setVertexCount(6);
    model.setInstanceCount(pointCount);
    setUniforms(model, { uResolution: [width, height] });
    model.draw(renderPass);
  }

  destroy(): void {
    this.model?.destroy();
    for (const b of this.buffers) b.destroy();
  }
}
