// Bar sizing/positioning inside one category band — the single source of truth
// for BarRenderer's four geometry branches and overlay/labels.ts, which has to
// place a label on the exact bar the renderer drew.
//
// Implements ECharts' documented layout (series-bar.barCategoryGap /
// series-bar.barGap, layout/barGrid.ts `calBarWidthAndOffset`):
//   usableWidth = bandwidth * (1 - barCategoryGap)
//   barSize     = usableWidth / (seriesCount + (seriesCount - 1) * barGapRatio)
//   gap         = barSize * barGapRatio
// so that seriesCount * barSize + (seriesCount - 1) * gap === usableWidth.

// ECharts documented default: series-bar.barCategoryGap = "20%" of the band.
const DEFAULT_BAR_CATEGORY_GAP_RATIO = 0.2;
// ECharts documented default: series-bar.barGap = "30%" of one bar's size.
const DEFAULT_BAR_GAP_RATIO = 0.3;

export interface BarLayoutInput {
  /** Category band width in pixels. Sign is ignored (the grid's y range is reversed). */
  bandwidth: number;
  /** Number of bars sharing one category band. */
  seriesCount: number;
  /** Explicit size: pixels (number) or "N%" of the bandwidth. Overrides the solved size. */
  barWidth?: number | string;
  barMaxWidth?: number | string;
  barMinWidth?: number | string;
  /** Percent string, e.g. "30%". Negative ("-100%") overlaps bars, as ECharts allows. */
  barGap?: string;
  /** Percent string, e.g. "20%". */
  barCategoryGap?: string;
}

export interface BarLayout {
  /** Size of one bar along the category axis, in pixels. */
  barSize: number;
  /** Signed pixel gap between two adjacent bars (negative when barGap is negative). */
  gap: number;
  /** Extent occupied by all bars of one category, gaps included. */
  totalWidth: number;
  /** Offset of the leading edge of bar `index`, relative to the band center. */
  offsetFor(index: number): number;
}

// "30%" → 0.3, "-100%" → -1. Anything else (undefined, a bare number, garbage)
// keeps the ECharts default: these two options are percent strings only.
function parseRatio(value: string | undefined, fallback: number): number {
  if (typeof value !== "string" || !value.endsWith("%")) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed / 100 : fallback;
}

// Pixels (number) or "N%" of the bandwidth. Returns undefined when unset or
// unusable, so the caller can tell "no clamp" from "clamp to 0".
function parseSize(
  value: number | string | undefined,
  bandwidth: number,
): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return value.endsWith("%") ? (parsed / 100) * bandwidth : parsed;
}

const EMPTY_LAYOUT: BarLayout = {
  barSize: 0,
  gap: 0,
  totalWidth: 0,
  offsetFor: () => 0,
};

export function resolveBarLayout(input: BarLayoutInput): BarLayout {
  const bandwidth = Math.abs(input.bandwidth);
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) return EMPTY_LAYOUT;

  const seriesCount = Math.max(1, Math.floor(input.seriesCount) || 1);
  // A category gap of 100% leaves no room at all; clamping keeps usableWidth
  // non-negative instead of producing mirrored (negative-size) bars.
  const categoryGapRatio = Math.min(
    1,
    Math.max(
      0,
      parseRatio(input.barCategoryGap, DEFAULT_BAR_CATEGORY_GAP_RATIO),
    ),
  );
  const barGapRatio = parseRatio(input.barGap, DEFAULT_BAR_GAP_RATIO);
  const usableWidth = bandwidth * (1 - categoryGapRatio);

  // barGap below -1/(seriesCount-1) would make the divisor zero or negative
  // (bars receding past full overlap); fall back to full overlap, the most
  // negative layout ECharts actually renders.
  const divisor = seriesCount + (seriesCount - 1) * barGapRatio;
  let barSize = divisor > 0 ? usableWidth / divisor : usableWidth;

  const explicitWidth = parseSize(input.barWidth, bandwidth);
  if (explicitWidth !== undefined) barSize = explicitWidth;

  const maxWidth = parseSize(input.barMaxWidth, bandwidth);
  if (maxWidth !== undefined) barSize = Math.min(barSize, maxWidth);
  const minWidth = parseSize(input.barMinWidth, bandwidth);
  if (minWidth !== undefined) barSize = Math.max(barSize, minWidth);

  const gap = barSize * barGapRatio;
  const totalWidth = seriesCount * barSize + (seriesCount - 1) * gap;
  return {
    barSize,
    gap,
    totalWidth,
    offsetFor: (index) => -totalWidth / 2 + index * (barSize + gap),
  };
}

// barGap/barCategoryGap are band-level options in ECharts — every bar in the
// category shares one layout — so the sizing options are read once per band,
// first series that declares one wins. Shared so BarRenderer and the label
// overlay cannot disagree about which series' options apply.
export type BarSizingOptions = Pick<
  BarLayoutInput,
  "barWidth" | "barMaxWidth" | "barMinWidth" | "barGap" | "barCategoryGap"
>;

export function barSizingOptions(
  seriesGroup: BarSizingOptions[],
): BarSizingOptions {
  const pick = <Key extends keyof BarSizingOptions>(
    key: Key,
  ): BarSizingOptions[Key] | undefined =>
    seriesGroup.find((entry) => entry[key] !== undefined)?.[key];
  return {
    barWidth: pick("barWidth"),
    barMaxWidth: pick("barMaxWidth"),
    barMinWidth: pick("barMinWidth"),
    barGap: pick("barGap"),
    barCategoryGap: pick("barCategoryGap"),
  };
}

// ECharts series-bar.barMinHeight: a bar whose value maps to fewer pixels than
// this stays visible at barMinHeight, keeping its sign (direction from the
// baseline). A zero value stays a zero-length bar.
export function applyBarMinHeight(
  signedLength: number,
  rawValue: number,
  barMinHeight: number | undefined,
): number {
  if (!barMinHeight || rawValue === 0 || !Number.isFinite(signedLength)) {
    return signedLength;
  }
  if (Math.abs(signedLength) >= barMinHeight) return signedLength;
  // Zero-length pixel span for a non-zero value: take the direction from the
  // value's sign, since the pixels carry none.
  const direction =
    signedLength !== 0 ? Math.sign(signedLength) : Math.sign(rawValue);
  return direction * barMinHeight;
}
