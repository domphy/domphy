import type { Device, Buffer, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import { BAR_VS, BAR_FS } from "./shaders/bar.glsl.js";
import { AREA_VS, AREA_FS } from "./shaders/line.glsl.js";
import type { CandlestickSeriesOption } from "../types.js";
import type { AnyScale } from "../scale/index.js";
import { seriesRgba, familyRgba } from "./color.js";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

export class CandlestickRenderer {
  private device: Device;
  private bodyModel: Model | null = null;
  private wickModel: Model | null = null;
  private quadVbo: Buffer | null = null;
  private buffers: Buffer[] = [];

  constructor(device: Device) {
    this.device = device;
  }

  private ensureBodyModel(): Model {
    if (this.bodyModel) return this.bodyModel;
    const quadVerts = new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]);
    this.quadVbo = this.device.createBuffer({ data: quadVerts, id: "candle-quad" });
    this.bodyModel = new Model(this.device, {
      vs: BAR_VS,
      fs: BAR_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "position", format: "float32x2" },
        {
          name: "instanceData",
          stepMode: "instance",
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
    return this.bodyModel;
  }

  private ensureWickModel(): Model {
    if (this.wickModel) return this.wickModel;
    this.wickModel = new Model(this.device, {
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
    return this.wickModel;
  }

  render(
    renderPass: RenderPass,
    series: CandlestickSeriesOption[],
    xScales: AnyScale[],
    yScales: AnyScale[],
    width: number,
    height: number,
    _seriesOffset: number,
  ): void {
    if (series.length === 0) return;
    const bodyModel = this.ensureBodyModel();
    const wickModel = this.ensureWickModel();

    for (const b of this.buffers) b.destroy();
    this.buffers = [];

    const upColor = seriesRgba(1);
    const downColor = seriesRgba(4);

    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;

      const bandwidth = xScale.bandwidth() * 0.7;
      const data = s.data ?? [];
      const bodyInstances: number[] = [];
      const upWickVerts: number[] = [];
      const downWickVerts: number[] = [];
      let bodyCount = 0;

      data.forEach((item, index) => {
        const raw = Array.isArray(item) ? item : (item as any)?.value;
        if (!raw || raw.length < 4) return;
        const [open, close, low, high] = raw as [number, number, number, number];
        const isUp = close >= open;
        const color = isUp
          ? (s.upColor ? familyRgba(s.upColor as any, "shift-9") : upColor)
          : (s.downColor ? familyRgba(s.downColor as any, "shift-9") : downColor);

        const xCenter = xScale.map(index);
        const yOpen = yScale.map(open);
        const yClose = yScale.map(close);
        const yLow = yScale.map(low);
        const yHigh = yScale.map(high);

        const rectY = Math.min(yOpen, yClose);
        const rectH = Math.abs(yClose - yOpen) || 1;
        bodyInstances.push(xCenter - bandwidth / 2, rectY, bandwidth, rectH, color[0], color[1], color[2], color[3], 0);
        bodyCount++;

        const hw = 0.5;
        const wickVerts = isUp ? upWickVerts : downWickVerts;
        wickVerts.push(
          xCenter - hw, yHigh, xCenter + hw, yHigh, xCenter - hw, yLow,
          xCenter + hw, yHigh, xCenter + hw, yLow, xCenter - hw, yLow,
        );
      });

      if (bodyCount > 0) {
        const instanceBuffer = this.device.createBuffer({ data: new Float32Array(bodyInstances), id: "candle-bodies" });
        this.buffers.push(instanceBuffer);
        bodyModel.setAttributes({ position: this.quadVbo!, instanceData: instanceBuffer });
        bodyModel.setVertexCount(6);
        bodyModel.setInstanceCount(bodyCount);
        setUniforms(bodyModel, { uResolution: [width, height] });
        bodyModel.draw(renderPass);
      }

      for (const [verts, color] of [[upWickVerts, upColor], [downWickVerts, downColor]] as const) {
        if (verts.length > 0) {
          const buffer = this.device.createBuffer({ data: new Float32Array(verts), id: "candle-wick" });
          this.buffers.push(buffer);
          wickModel.setAttributes({ aPosition: buffer });
          wickModel.setVertexCount(verts.length / 2);
          setUniforms(wickModel, { uResolution: [width, height], uColor: color });
          wickModel.draw(renderPass);
        }
      }
    }
  }

  destroy(): void {
    this.bodyModel?.destroy();
    this.wickModel?.destroy();
    this.quadVbo?.destroy();
    for (const b of this.buffers) b.destroy();
  }
}
