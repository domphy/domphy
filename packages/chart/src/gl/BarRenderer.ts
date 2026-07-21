import type { Buffer, Device, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import type { AnyScale } from "../scale/index.js";
import type { BarSeriesOption, ChartRect } from "../types.js";
import { hexToRgba, resolveColorSrc, seriesRgba } from "./color.js";
import { BAR_FS, BAR_VS } from "./shaders/bar.glsl.js";

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
  ): void {
    if (series.length === 0) return;
    const model = this.ensureModel();

    for (const b of this.instanceBuffers) b.destroy();
    this.instanceBuffers = [];

    const stackGroups = new Map<string | null, BarSeriesOption[]>();
    for (const s of series) {
      const key = s.stack ?? null;
      if (!stackGroups.has(key)) stackGroups.set(key, []);
      stackGroups.get(key)!.push(s);
    }

    const grouped = stackGroups.get(null) ?? [];
    const stacked = [...stackGroups.entries()].filter(([k]) => k !== null);

    const firstSeries = series[0];
    const xScale = xScales[firstSeries?.xAxisIndex ?? 0];
    const yScale = yScales[firstSeries?.yAxisIndex ?? 0];
    if (!xScale || !yScale) return;

    const allInstances: number[] = [];
    let barCount = 0;
    const barRadius = 2;
    const gap = 2; // px gap between bars in a group

    // Detect orientation: y-axis has bandwidth → horizontal bars (y=category, x=value).
    // The grid's y-scale pixel range is intentionally reversed (bottom→top, see
    // coord/grid.ts) so an ordinal y-scale's bandwidth() comes back negative —
    // same quirk HeatmapRenderer.ts already guards against with Math.abs(). Without
    // it, `> 0` is always false for horizontal bars and they silently fail to render.
    const isHorizontal = Math.abs(yScale.bandwidth()) > 0;

    if (isHorizontal) {
      // Horizontal grouped bars
      const bandH = Math.abs(yScale.bandwidth());
      const groupCount = Math.max(1, grouped.length);
      const groupBarH =
        groupCount > 1
          ? (bandH * 0.85 - (groupCount - 1) * gap) / groupCount
          : bandH * 0.65;
      const totalGroupH = groupCount * groupBarH + (groupCount - 1) * gap;
      const baselineX = xScale.map(0);

      grouped.forEach((s, groupIndex) => {
        const color = resolveColorSrc(
          s.color,
          seriesRgba(seriesOffset + series.indexOf(s)),
        );
        const data = s.data ?? [];
        data.forEach((item, dataIndex) => {
          const rawValue =
            typeof item === "number"
              ? item
              : Array.isArray(item)
                ? (item[1] as number)
                : typeof (item as any)?.value === "number"
                  ? (item as any).value
                  : null;
          if (rawValue === null) return;

          const yCenter = yScale.map(dataIndex);
          const xRight = xScale.map(rawValue);
          const rectX = Math.min(baselineX, xRight);
          const rectW = Math.abs(xRight - baselineX);
          const rectY =
            yCenter - totalGroupH / 2 + groupIndex * (groupBarH + gap);
          const c = (item as any)?.itemStyle?.color
            ? hexToRgba((item as any).itemStyle.color)
            : color;
          allInstances.push(
            rectX,
            rectY,
            rectW,
            groupBarH,
            c[0],
            c[1],
            c[2],
            c[3],
            barRadius,
          );
          barCount++;
        });
      });

      // Horizontal stacked bars
      for (const [, stackSeries] of stacked) {
        const stackRights = new Map<number, number>();
        stackSeries.forEach((s) => {
          const color = resolveColorSrc(
            s.color,
            seriesRgba(seriesOffset + series.indexOf(s)),
          );
          const data = s.data ?? [];
          data.forEach((item, dataIndex) => {
            const rawValue =
              typeof item === "number"
                ? item
                : Array.isArray(item)
                  ? (item[1] as number)
                  : typeof (item as any)?.value === "number"
                    ? (item as any).value
                    : null;
            if (rawValue === null) return;

            const prevRight = stackRights.get(dataIndex) ?? 0;
            const newRight = prevRight + rawValue;
            stackRights.set(dataIndex, newRight);

            const yCenter = yScale.map(dataIndex);
            const barH = bandH * 0.85;
            const xLeft = xScale.map(prevRight);
            const xRight = xScale.map(newRight);
            const rectX = Math.min(xLeft, xRight);
            const rectW = Math.abs(xRight - xLeft);
            const rectY = yCenter - barH / 2;
            allInstances.push(
              rectX,
              rectY,
              rectW,
              barH,
              color[0],
              color[1],
              color[2],
              color[3],
              barRadius,
            );
            barCount++;
          });
        });
      }
    } else {
      // Vertical bars (original behavior)
      const bandwidth = xScale.bandwidth();
      const groupCount = Math.max(1, grouped.length);
      const groupBarWidth =
        groupCount > 1
          ? (bandwidth * 0.85 - (groupCount - 1) * gap) / groupCount
          : bandwidth * 0.65;
      const totalGroupWidth =
        groupCount * groupBarWidth + (groupCount - 1) * gap;
      const baselineY = yScale.map(0);

      grouped.forEach((s, groupIndex) => {
        const color = resolveColorSrc(
          s.color,
          seriesRgba(seriesOffset + series.indexOf(s)),
        );
        const data = s.data ?? [];
        data.forEach((item, dataIndex) => {
          const rawValue =
            typeof item === "number"
              ? item
              : Array.isArray(item)
                ? (item[1] as number)
                : typeof (item as any)?.value === "number"
                  ? (item as any).value
                  : null;
          if (rawValue === null) return;

          const xArg =
            typeof item === "number"
              ? dataIndex
              : Array.isArray(item)
                ? item[0]
                : dataIndex;
          const xCenter = xScale.map(xArg as number);
          const yTop = yScale.map(rawValue);
          const xLeft =
            xCenter - totalGroupWidth / 2 + groupIndex * (groupBarWidth + gap);
          const rectY = Math.min(yTop, baselineY);
          const rectH = Math.abs(baselineY - yTop);
          const c = (item as any)?.itemStyle?.color
            ? hexToRgba((item as any).itemStyle.color)
            : color;
          allInstances.push(
            xLeft,
            rectY,
            groupBarWidth,
            rectH,
            c[0],
            c[1],
            c[2],
            c[3],
            barRadius,
          );
          barCount++;
        });
      });

      for (const [, stackSeries] of stacked) {
        const stackTops = new Map<number, number>();
        stackSeries.forEach((s) => {
          const color = resolveColorSrc(
            s.color,
            seriesRgba(seriesOffset + series.indexOf(s)),
          );
          const data = s.data ?? [];
          data.forEach((item, dataIndex) => {
            const rawValue =
              typeof item === "number"
                ? item
                : Array.isArray(item)
                  ? (item[1] as number)
                  : typeof (item as any)?.value === "number"
                    ? (item as any).value
                    : null;
            if (rawValue === null) return;

            const prevTop = stackTops.get(dataIndex) ?? 0;
            const newTop = prevTop + rawValue;
            stackTops.set(dataIndex, newTop);
            const xArg =
              typeof item === "number"
                ? dataIndex
                : Array.isArray(item)
                  ? item[0]
                  : dataIndex;
            const xCenter = xScale.map(xArg as number);
            const xLeft = xCenter - (bandwidth * 0.85) / 2;
            const yTop = yScale.map(newTop);
            const yBottom = yScale.map(prevTop);
            const rectY = Math.min(yTop, yBottom);
            const rectH = Math.abs(yBottom - yTop);
            allInstances.push(
              xLeft,
              rectY,
              bandwidth * 0.85,
              rectH,
              color[0],
              color[1],
              color[2],
              color[3],
              barRadius,
            );
            barCount++;
          });
        });
      }
    }

    if (barCount === 0) return;

    const instanceBuffer = this.device.createBuffer({
      data: new Float32Array(allInstances),
      id: "bar-instances",
    });
    this.instanceBuffers.push(instanceBuffer);

    model.setAttributes({
      position: this.quadVbo!,
      instanceData: instanceBuffer,
    });
    model.setVertexCount(6);
    model.setInstanceCount(barCount);
    setUniforms(model, { uResolution: [width, height] });
    model.draw(renderPass);
  }

  destroy(): void {
    this.model?.destroy();
    this.quadVbo?.destroy();
    for (const b of this.instanceBuffers) b.destroy();
  }
}
