import type { Buffer, Device, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import type { PieDataItem, PieSeriesOption } from "../types.js";
import { familyRgba, seriesRgba } from "./color.js";
import { PIE_FS, PIE_VS } from "./shaders/pie.glsl.js";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

export class PieRenderer {
  private device: Device;
  private model: Model | null = null;
  private buffers: Buffer[] = [];

  constructor(device: Device) {
    this.device = device;
  }

  private ensureModel(): Model {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: PIE_VS,
      fs: PIE_FS,
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

  clearBuffers(): void {
    for (const b of this.buffers) b.destroy();
    this.buffers = [];
  }

  render(
    renderPass: RenderPass,
    series: PieSeriesOption[],
    width: number,
    height: number,
    seriesOffset: number,
  ): void {
    if (series.length === 0) return;
    const model = this.ensureModel();
    const minSize = Math.min(width, height);
    const PI2 = Math.PI * 2;

    for (const s of series) {
      const center = s.center ?? ["50%", "50%"];
      const cx =
        typeof center[0] === "number"
          ? center[0]
          : (parseFloat(center[0]) / 100) * width;
      const cy =
        typeof center[1] === "number"
          ? center[1]
          : (parseFloat(center[1]) / 100) * height;

      const halfMin = minSize / 2;
      let innerR = 0;
      let outerR = halfMin * 0.7;
      if (s.radius) {
        const r = s.radius;
        if (Array.isArray(r)) {
          innerR =
            typeof r[0] === "number"
              ? r[0]
              : (parseFloat(r[0]) / 100) * halfMin;
          outerR =
            typeof r[1] === "number"
              ? r[1]
              : (parseFloat(r[1]) / 100) * halfMin;
        } else {
          outerR = typeof r === "number" ? r : (parseFloat(r) / 100) * halfMin;
        }
      }

      const data = (s.data ?? []) as PieDataItem[];
      const total = data.reduce((sum, item) => sum + (item.value ?? 0), 0) || 1;
      const startOffset = -Math.PI / 2;
      const roseType = s.roseType;
      const maxValue =
        roseType === "radius"
          ? Math.max(...data.map((d) => d.value ?? 0)) || 1
          : 1;

      let currentAngle = startOffset;

      data.forEach((item, index) => {
        const fraction = (item.value ?? 0) / total;
        const sweepAngle = fraction * PI2;
        const endAngle = currentAngle + sweepAngle;

        const effectiveOuter =
          roseType === "radius"
            ? innerR + (outerR - innerR) * ((item.value ?? 0) / maxValue)
            : roseType === "area"
              ? innerR + (outerR - innerR) * Math.sqrt(fraction)
              : outerR;

        const color = item.itemStyle?.color
          ? familyRgba(item.itemStyle.color as any, "shift-9")
          : seriesRgba(index);
        const opacity = (s.itemStyle?.opacity as number) ?? 1;
        const finalColor = [color[0], color[1], color[2], color[3] * opacity];

        const quadSize = effectiveOuter + 2;
        const quadVerts = new Float32Array([
          cx - quadSize,
          cy - quadSize,
          cx + quadSize,
          cy - quadSize,
          cx - quadSize,
          cy + quadSize,
          cx + quadSize,
          cy - quadSize,
          cx + quadSize,
          cy + quadSize,
          cx - quadSize,
          cy + quadSize,
        ]);
        const buffer = this.device.createBuffer({
          data: quadVerts,
          id: `pie-sector-${index}`,
        });
        this.buffers.push(buffer);

        model.setAttributes({ aPosition: buffer });
        model.setVertexCount(6);
        setUniforms(model, {
          uResolution: [width, height],
          uCenter: [cx, cy],
          uOuterRadius: effectiveOuter,
          uInnerRadius: innerR,
          uStartAngle: mod2pi(currentAngle),
          uEndAngle: mod2pi(endAngle),
          uColor: finalColor,
        });
        model.draw(renderPass);

        currentAngle = endAngle;
      });
    }
  }

  destroy(): void {
    this.clearBuffers();
    this.model?.destroy();
  }
}

function mod2pi(angle: number): number {
  const PI2 = Math.PI * 2;
  return ((angle % PI2) + PI2) % PI2;
}
