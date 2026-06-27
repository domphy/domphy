import type { Device, Buffer, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import { LINE_VS, LINE_FS, AREA_VS, AREA_FS, GRADIENT_AREA_VS, GRADIENT_AREA_FS } from "./shaders/line.glsl.js";
import type { LineSeriesOption, ChartRect } from "../types.js";
import type { AnyScale } from "../scale/index.js";
import { seriesRgba, familyRgba, isGradient, gradientEndpoints } from "./color.js";
import type { Rgba } from "./color.js";
type Point2d = { x: number; y: number };

function splinePointAt(points: Point2d[], t: number): Point2d {
  const n = points.length;
  const seg = Math.min(Math.floor(t * (n - 1)), n - 2);
  const u = t * (n - 1) - seg;
  const p0 = points[Math.max(seg - 1, 0)];
  const p1 = points[seg];
  const p2 = points[Math.min(seg + 1, n - 1)];
  const p3 = points[Math.min(seg + 2, n - 1)];
  const u2 = u * u;
  const u3 = u2 * u;
  const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
  const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);
  return { x, y };
}

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

export class LineRenderer {
  private device: Device;
  private lineModel: Model | null = null;
  private areaModel: Model | null = null;
  private gradientAreaModel: Model | null = null;
  private buffers: Buffer[] = [];

  constructor(device: Device) {
    this.device = device;
  }

  private ensureLineModel(): Model {
    if (this.lineModel) return this.lineModel;
    this.lineModel = new Model(this.device, {
      vs: LINE_VS,
      fs: LINE_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "aPointDir", format: "float32x4" },
        { name: "aSide", format: "float32" },
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
    return this.lineModel;
  }

  private ensureAreaModel(): Model {
    if (this.areaModel) return this.areaModel;
    const blendParams = {
      depthWriteEnabled: false,
      blend: true,
      blendColorSrcFactor: "src-alpha",
      blendColorDstFactor: "one-minus-src-alpha",
      blendAlphaSrcFactor: "one",
      blendAlphaDstFactor: "one-minus-src-alpha",
    } as const;
    this.areaModel = new Model(this.device, {
      vs: AREA_VS,
      fs: AREA_FS,
      topology: "triangle-list",
      bufferLayout: [{ name: "aPosition", format: "float32x2" }],
      parameters: blendParams,
    });
    return this.areaModel;
  }

  private ensureGradientAreaModel(): Model {
    if (this.gradientAreaModel) return this.gradientAreaModel;
    this.gradientAreaModel = new Model(this.device, {
      vs: GRADIENT_AREA_VS,
      fs: GRADIENT_AREA_FS,
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
    return this.gradientAreaModel;
  }

  private buildPixelPoints(series: LineSeriesOption, xScale: AnyScale, yScale: AnyScale): [number, number][] {
    const rawData = series.data ?? [];
    const points: [number, number][] = [];

    for (let index = 0; index < rawData.length; index++) {
      const item = rawData[index];
      let xVal: any;
      let yVal: number | null;

      if (typeof item === "number") {
        xVal = index; yVal = item;
      } else if (Array.isArray(item)) {
        xVal = item[0]; yVal = item[1] as number;
      } else if (item && typeof item === "object") {
        const raw = (item as any).value;
        if (Array.isArray(raw)) { xVal = raw[0]; yVal = raw[1]; }
        else { xVal = index; yVal = raw; }
      } else {
        continue;
      }

      if (yVal === null || yVal === undefined || Number.isNaN(yVal)) {
        if (!series.connectNulls) points.push([NaN, NaN]);
        continue;
      }
      points.push([xScale.map(xVal), yScale.map(yVal)]);
    }

    const smooth = series.smooth;
    if ((smooth === true || (typeof smooth === "number" && smooth > 0)) && points.length >= 4) {
      const valid = points.filter(([x]) => !isNaN(x));
      try {
        const pts = valid.map(([x, y]) => ({ x, y } as Point2d));
        const smoothed: [number, number][] = [];
        const steps = valid.length * 8;
        for (let step = 0; step <= steps; step++) {
          const p = splinePointAt(pts, step / steps);
          smoothed.push([p.x, p.y]);
        }
        return smoothed;
      } catch {
        // Fall back to linear
      }
    }

    if (series.step) {
      const expanded: [number, number][] = [];
      for (let index = 0; index < points.length - 1; index++) {
        const [x0, y0] = points[index];
        const [x1, y1] = points[index + 1];
        if (isNaN(x0) || isNaN(x1)) { expanded.push([NaN, NaN]); continue; }
        if (series.step === "start") { expanded.push([x0, y0], [x0, y1]); }
        else if (series.step === "end") { expanded.push([x0, y0], [x1, y0]); }
        else { const mx = (x0 + x1) / 2; expanded.push([x0, y0], [mx, y0], [mx, y1]); }
      }
      if (points.length > 0) expanded.push(points[points.length - 1]);
      return expanded;
    }

    return points;
  }

  private buildLineGeom(pixelPoints: [number, number][]): { pointDir: Float32Array; sides: Float32Array; vertexCount: number } {
    const segments: [number, number][][] = [];
    let current: [number, number][] = [];
    for (const p of pixelPoints) {
      if (isNaN(p[0])) { if (current.length > 1) segments.push(current); current = []; }
      else current.push(p);
    }
    if (current.length > 1) segments.push(current);

    const pointDirArr: number[] = [];
    const sidesArr: number[] = [];

    for (const seg of segments) {
      for (let index = 0; index < seg.length - 1; index++) {
        const [x0, y0] = seg[index];
        const [x1, y1] = seg[index + 1];
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const dx = (x1 - x0) / len;
        const dy = (y1 - y0) / len;

        const verts: [number, number, number, number, number][] = [
          [x0, y0, dx, dy, -1],
          [x1, y1, dx, dy, -1],
          [x0, y0, dx, dy, 1],
          [x1, y1, dx, dy, -1],
          [x1, y1, dx, dy, 1],
          [x0, y0, dx, dy, 1],
        ];
        for (const [px, py, ddx, ddy, side] of verts) {
          pointDirArr.push(px, py, ddx, ddy);
          sidesArr.push(side);
        }
      }
    }

    return {
      pointDir: new Float32Array(pointDirArr),
      sides: new Float32Array(sidesArr),
      vertexCount: sidesArr.length,
    };
  }

  render(
    renderPass: RenderPass,
    series: LineSeriesOption[],
    xScales: AnyScale[],
    yScales: AnyScale[],
    _gridRect: ChartRect,
    width: number,
    height: number,
    seriesOffset: number,
  ): void {
    const lineModel = this.ensureLineModel();
    const areaModel = this.ensureAreaModel();

    for (const b of this.buffers) b.destroy();
    this.buffers = [];

    for (let index = 0; index < series.length; index++) {
      const s = series[index];
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;

      const color: Rgba = s.color ? familyRgba(s.color as any, "shift-9") : seriesRgba(seriesOffset + index);
      const lineAlpha = s.lineStyle?.opacity ?? 1;
      const lineColor: Rgba = [color[0], color[1], color[2], color[3] * (lineAlpha as number)];
      const lineWidth = ((s.lineStyle?.width ?? 2) as number) / 2;

      const pixelPoints = this.buildPixelPoints(s, xScale, yScale);

      // Area fill
      if (s.areaStyle) {
        const areaAlpha = ((s.areaStyle.opacity as number) ?? 0.3);
        const baselineY = yScale.map(0);
        const areaVerts: number[] = [];

        const segs: [number, number][][] = [];
        let cur: [number, number][] = [];
        for (const p of pixelPoints) {
          if (isNaN(p[0])) { if (cur.length > 1) segs.push(cur); cur = []; }
          else cur.push(p);
        }
        if (cur.length > 1) segs.push(cur);

        for (const seg of segs) {
          for (let si = 0; si < seg.length - 1; si++) {
            const [x0, y0] = seg[si];
            const [x1, y1] = seg[si + 1];
            areaVerts.push(x0, baselineY, x1, baselineY, x0, y0, x1, baselineY, x1, y1, x0, y0);
          }
        }

        if (areaVerts.length > 0) {
          const areaBuffer = this.device.createBuffer({ data: new Float32Array(areaVerts), id: "line-area" });
          this.buffers.push(areaBuffer);

          const colorSrc = s.areaStyle.color;
          if (isGradient(colorSrc)) {
            const gradModel = this.ensureGradientAreaModel();
            const { top, bottom } = gradientEndpoints(colorSrc, color);
            const topWithAlpha: Rgba = [top[0], top[1], top[2], top[3] * areaAlpha];
            const bottomWithAlpha: Rgba = [bottom[0], bottom[1], bottom[2], bottom[3] * areaAlpha];
            // Compute y range from vertices
            const ys = areaVerts.filter((_, i) => i % 2 === 1);
            const yTop = Math.min(...ys);
            const yBottom = Math.max(...ys);
            gradModel.setAttributes({ aPosition: areaBuffer });
            gradModel.setVertexCount(areaVerts.length / 2);
            setUniforms(gradModel, {
              uResolution: [width, height],
              uYTop: yTop,
              uYBottom: yBottom,
              uColorTop: topWithAlpha,
              uColorBottom: bottomWithAlpha,
            });
            gradModel.draw(renderPass);
          } else {
            const areaColor: Rgba = [color[0], color[1], color[2], color[3] * areaAlpha];
            areaModel.setAttributes({ aPosition: areaBuffer });
            areaModel.setVertexCount(areaVerts.length / 2);
            setUniforms(areaModel, { uResolution: [width, height], uColor: areaColor });
            areaModel.draw(renderPass);
          }
        }
      }

      // Line — only skip if explicitly set to "none" (not a valid value, but guard anyway)
      const lineType = s.lineStyle?.type;
      if (lineType !== "none" as any) {
        const { pointDir, sides, vertexCount } = this.buildLineGeom(pixelPoints);
        if (vertexCount > 0) {
          const pdBuffer = this.device.createBuffer({ data: pointDir, id: "line-pd" });
          const sideBuffer = this.device.createBuffer({ data: sides, id: "line-side" });
          this.buffers.push(pdBuffer, sideBuffer);
          lineModel.setAttributes({ aPointDir: pdBuffer, aSide: sideBuffer });
          lineModel.setVertexCount(vertexCount);
          setUniforms(lineModel, { uResolution: [width, height], uLineWidth: lineWidth, uColor: lineColor });
          lineModel.draw(renderPass);
        }
      }
    }
  }

  destroy(): void {
    this.lineModel?.destroy();
    this.areaModel?.destroy();
    this.gradientAreaModel?.destroy();
    for (const b of this.buffers) b.destroy();
  }
}
