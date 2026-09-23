import type { Buffer, Device, RenderPass } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import {
  applyItemState,
  type ItemStateResolver,
  NO_ITEM_STATES,
} from "../itemStates.js";
import type { PieDataItem, PieSeriesOption } from "../types.js";
import type { ColorResolver } from "./color.js";
import { PIE_FS, PIE_VS } from "./shaders/pie.glsl.js";

function setUniforms(model: Model, uniforms: Record<string, unknown>): void {
  (model as any).props.uniforms = uniforms;
}

export interface PieSliceLayout {
  dataIndex: number;
  item: PieDataItem;
  startAngle: number;
  endAngle: number;
  fraction: number;
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
  effectiveOuter: number;
}

function parseLength(value: string | number, total: number): number {
  return typeof value === "number" ? value : (parseFloat(value) / 100) * total;
}

/** ECharts startAngle 90 = 12 o'clock; screen y-down uses −radians. */
export function pieStartRadians(startAngle = 90): number {
  return -(startAngle * Math.PI) / 180;
}

export function pieSweepSign(clockwise?: boolean): number {
  return clockwise === false ? -1 : 1;
}

// ECharts: a pie sums only the positive, finite values. A NaN datum used to
// poison the total (`NaN || 1` collapsed it to 1, so a single slice swept
// hundreds of radians) and a negative one subtracted from it, leaving the
// remaining slices short of a full circle. Both render as zero-width slices.
function sliceValue(item: PieDataItem): number {
  const raw = item?.value;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export function computePieSlices(
  series: PieSeriesOption,
  width: number,
  height: number,
  hiddenSeries?: ReadonlySet<string>,
): PieSliceLayout[] {
  const minSize = Math.min(width, height);
  const center = series.center ?? ["50%", "50%"];
  const cx = parseLength(center[0], width);
  const cy = parseLength(center[1], height);
  const halfMin = minSize / 2;
  let innerR = 0;
  let outerR = halfMin * 0.7;
  if (series.radius) {
    const radius = series.radius;
    if (Array.isArray(radius)) {
      innerR = parseLength(radius[0], halfMin);
      outerR = parseLength(radius[1], halfMin);
    } else {
      outerR = parseLength(radius, halfMin);
    }
  }

  const data = (series.data ?? []) as PieDataItem[];
  const visible = data
    .map((item, dataIndex) => ({ item, dataIndex }))
    .filter(({ item }) => {
      if (!hiddenSeries || typeof item?.name !== "string") return true;
      return !hiddenSeries.has(item.name);
    });
  const total =
    visible.reduce((sum, entry) => sum + sliceValue(entry.item), 0) || 1;
  const roseType = series.roseType;
  const maxValue =
    roseType === "radius"
      ? Math.max(...visible.map((entry) => sliceValue(entry.item)), 0) || 1
      : 1;
  const direction = pieSweepSign(series.clockwise);
  let currentAngle = pieStartRadians(series.startAngle);
  const twoPi = Math.PI * 2;

  return visible.map(({ item, dataIndex }) => {
    const fraction = sliceValue(item) / total;
    const sweepAngle = direction * fraction * twoPi;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    currentAngle = endAngle;
    const effectiveOuter =
      roseType === "radius"
        ? innerR + (outerR - innerR) * (sliceValue(item) / maxValue)
        : roseType === "area"
          ? innerR + (outerR - innerR) * Math.sqrt(fraction)
          : outerR;
    return {
      dataIndex,
      item,
      startAngle,
      endAngle,
      fraction,
      cx,
      cy,
      innerR,
      outerR,
      effectiveOuter,
    };
  });
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
    _seriesOffset: number,
    color: ColorResolver,
    hiddenSeries?: ReadonlySet<string>,
    states: ItemStateResolver = NO_ITEM_STATES,
  ): void {
    if (series.length === 0) return;
    const model = this.ensureModel();

    for (const s of series) {
      const slices = computePieSlices(s, width, height, hiddenSeries);
      const opacity = (s.itemStyle?.opacity as number) ?? 1;

      for (const slice of slices) {
        // A zero-value datum (or a NaN/negative one, which counts as zero)
        // sweeps no angle. The shader's `angle >= start && angle <= end` test
        // still matches the single ray where start === end, so each such slice
        // painted a 1px line out from the center.
        if (slice.endAngle === slice.startAngle) continue;
        const sliceColor = color.rgba(
          slice.item.itemStyle?.color,
          slice.dataIndex,
        );
        const state = states(s, slice.dataIndex);
        const stateColor = applyItemState(
          sliceColor,
          state,
          color,
          slice.dataIndex,
        );
        const finalColor = [
          stateColor[0],
          stateColor[1],
          stateColor[2],
          stateColor[3] * opacity,
        ];

        // Emphasis grows the sector (`emphasis.scaleSize`) and selection
        // slides it out along its own bisector (`selectedOffset`) — the two
        // gestures ECharts gives a pie.
        const outer = slice.effectiveOuter * state.scale + state.scaleSize;
        const midAngle = (slice.startAngle + slice.endAngle) / 2;
        const cx = slice.cx + Math.cos(midAngle) * state.offset;
        const cy = slice.cy + Math.sin(midAngle) * state.offset;

        const quadSize = outer + 2;
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
          id: `pie-sector-${slice.dataIndex}`,
        });
        this.buffers.push(buffer);

        model.setAttributes({ aPosition: buffer });
        model.setVertexCount(6);
        // Shader sector test assumes start→end clockwise in screen space
        // (increasing atan2). Counter-clockwise slices swap the uniforms so
        // the wrapped-arc branch still covers the swept wedge.
        const start = slice.startAngle;
        const end = slice.endAngle;
        const [uStart, uEnd] = end >= start ? [start, end] : [end, start];
        // A slice that sweeps the whole circle (a single-datum pie, or the
        // last one left after the others are hidden) normalizes to
        // start === end, which the shader's angular test reads as one ray —
        // the pie used to render as a hairline. uFullTurn skips the test.
        setUniforms(model, {
          uResolution: [width, height],
          uCenter: [cx, cy],
          uOuterRadius: outer,
          uInnerRadius: slice.innerR,
          uStartAngle: mod2pi(uStart),
          uEndAngle: mod2pi(uEnd),
          uFullTurn: uEnd - uStart >= FULL_TURN - 1e-9 ? 1 : 0,
          uColor: finalColor,
        });
        model.draw(renderPass);
      }
    }
  }

  destroy(): void {
    this.clearBuffers();
    this.model?.destroy();
  }
}

const FULL_TURN = Math.PI * 2;

function mod2pi(angle: number): number {
  return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/** True when `cursor` (atan2, y-down) lies on the signed start→end sweep. */
export function angleInPieSlice(
  cursor: number,
  startAngle: number,
  endAngle: number,
): boolean {
  // A full-turn slice (one visible piece after legend hide) normalizes to
  // start === end; that must still hit everywhere in the ring.
  if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 1e-9) return true;
  const cursorNorm = mod2pi(cursor);
  const start = mod2pi(startAngle);
  const end = mod2pi(endAngle);
  if (endAngle >= startAngle) {
    if (start <= end) return cursorNorm >= start && cursorNorm < end;
    return cursorNorm >= start || cursorNorm < end;
  }
  if (end <= start) return cursorNorm <= start && cursorNorm > end;
  return cursorNorm <= start || cursorNorm > end;
}
