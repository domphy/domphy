// Shared building blocks for the shadcn "chart-area" recipe family
// (chartAreaDefault / Gradient / Stacked / StackedExpand / Step / Linear /
// Interactive / Legend / Icons / Axes). Not itself an exported block — every
// factory in this family composes these helpers into its own fixed, literal
// element tree.
//
// Clean-room note: this is an independent reimplementation of the public
// *behavior* described in the block specs (a card-shelled area chart with a
// trend footer, built on top of @domphy/chart's WebGL/SVG engine). Layout,
// sample data, icon artwork and code are original.
//
// @domphy/chart engine notes learned while building this family (see
// packages/chart/src/gl/LineRenderer.ts and engine.ts):
//   - A solid (non-gradient) area fill always uses the series-level `color`
//     field (or, if unset, the engine's default palette rotation by series
//     position) — `areaStyle.color` as a plain ThemeColor role is IGNORED for
//     solid fills; it only matters when it is a GradientObject.
//   - The tooltip's color-coded dot is computed from the same default
//     rotation-by-index palette, NOT from the series' configured `color`. To
//     keep the rendered fill and the tooltip dot visually consistent, every
//     recipe below assigns per-series colors in that same rotation order
//     (primary, secondary, success, …).
//   - The built-in axis-trigger tooltip does not print the hovered category
//     label by default, and `TooltipParams.axisValueLabel` is declared in the
//     type but never populated at runtime — `chartAxisTooltipFormatter` below
//     resolves the category itself from `dataIndex` against the caller's own
//     data array instead of relying on it.

import type { ChartOption, GradientObject, TooltipParams } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type {
  DomphyElement,
  Listener,
  PartialElement,
  ReadableState,
} from "@domphy/core";
import { toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeColorToken,
  themeSpacing,
} from "@domphy/theme";
import { card, heading, icon, motion, paragraph, small } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";

// ─── Data shapes ───────────────────────────────────────────────────────────

export interface ChartAreaSinglePoint {
  month: string;
  value: number;
}

export interface ChartAreaTwoSeriesPoint {
  month: string;
  desktop: number;
  mobile: number;
}

export interface ChartAreaThreeSeriesPoint {
  month: string;
  desktop: number;
  mobile: number;
  other: number;
}

export interface ChartAreaDailyPoint {
  date: string; // "YYYY-MM-DD"
  desktop: number;
  mobile: number;
}

// ─── Original sample datasets (six monthly points, invented for this port) ─

export const CHART_AREA_MONTHLY_DATA: ChartAreaSinglePoint[] = [
  { month: "Jan", value: 148 },
  { month: "Feb", value: 172 },
  { month: "Mar", value: 129 },
  { month: "Apr", value: 194 },
  { month: "May", value: 221 },
  { month: "Jun", value: 258 },
];

export const CHART_AREA_TWO_SERIES_DATA: ChartAreaTwoSeriesPoint[] = [
  { month: "Jan", desktop: 142, mobile: 96 },
  { month: "Feb", desktop: 165, mobile: 114 },
  { month: "Mar", desktop: 151, mobile: 108 },
  { month: "Apr", desktop: 189, mobile: 132 },
  { month: "May", desktop: 176, mobile: 141 },
  { month: "Jun", desktop: 214, mobile: 158 },
];

export const CHART_AREA_THREE_SERIES_DATA: ChartAreaThreeSeriesPoint[] = [
  { month: "Jan", desktop: 142, mobile: 96, other: 22 },
  { month: "Feb", desktop: 165, mobile: 114, other: 18 },
  { month: "Mar", desktop: 151, mobile: 108, other: 26 },
  { month: "Apr", desktop: 189, mobile: 132, other: 20 },
  { month: "May", desktop: 176, mobile: 141, other: 24 },
  { month: "Jun", desktop: 214, mobile: 158, other: 19 },
];

// The reference sample is anchored to the dataset's own latest date, not the
// real current date — this fixed anchor keeps the block (and its tests)
// deterministic. See @domphy/blocks/shadcn/charts/chart-area-interactive.ts.
export const CHART_AREA_DAILY_END_DATE = "2026-06-29";

/** Deterministic (non-random) daily series generator — original wave shapes. */
export function generateChartAreaDailyData(
  days = 92,
  endDate: string = CHART_AREA_DAILY_END_DATE,
): ChartAreaDailyPoint[] {
  const end = new Date(`${endDate}T00:00:00Z`);
  const points: ChartAreaDailyPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - offset);
    const dayNumber = days - offset;
    const desktop = Math.round(
      180 +
        60 * Math.sin(dayNumber / 6) +
        40 * Math.sin(dayNumber / 17) +
        dayNumber * 0.6,
    );
    const mobile = Math.round(
      90 +
        30 * Math.sin(dayNumber / 5 + 1.2) +
        20 * Math.sin(dayNumber / 13) +
        dayNumber * 0.35,
    );
    points.push({
      date: date.toISOString().slice(0, 10),
      desktop: Math.max(20, desktop),
      mobile: Math.max(10, mobile),
    });
  }
  return points;
}

export const CHART_AREA_DAILY_DATA: ChartAreaDailyPoint[] =
  generateChartAreaDailyData();

export interface ChartRangePreset {
  label: string;
  days: number;
}

export const CHART_AREA_RANGE_PRESETS: ChartRangePreset[] = [
  { label: "Last 3 months", days: 90 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 7 days", days: 7 },
];

// ─── Color helpers ─────────────────────────────────────────────────────────

// Series color rotation the engine's own default palette follows (see
// packages/chart/src/gl/color.ts SERIES_PALETTE) — recipes assign explicit
// per-series colors in this same order so the rendered fill and the (engine-
// controlled, rotation-index-based) tooltip dot stay visually consistent.
export const CHART_AREA_SERIES_PALETTE: ThemeColor[] = [
  "primary",
  "secondary",
  "success",
];

function hexToRgbTriple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

// Resolves a theme color role to a literal "rgba(r,g,b,alpha)" string via
// themeColorToken() — required because @domphy/chart gradient color stops are
// ECharts-compatible literal color strings, not reactive theme functions, so
// this is the closest a chart-option value can get to "theme token, not a
// hardcoded literal".
export function chartColorRgba(
  role: ThemeColor,
  alpha: number,
  tone = "shift-9",
): string {
  const [r, g, b] = hexToRgbTriple(themeColorToken(null, tone, role));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Vertical fill gradient for one area series: a visible tint just under the
// line, fading to near-nothing at the baseline.
export function chartAreaGradientFill(
  role: ThemeColor,
  topAlpha = 0.8,
  bottomAlpha = 0.1,
): GradientObject {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: chartColorRgba(role, topAlpha) },
      { offset: 1, color: chartColorRgba(role, bottomAlpha) },
    ],
  };
}

// ─── Axis presets ──────────────────────────────────────────────────────────

// No axis line/tick/gridline chrome — only the floating category labels.
export const CHART_AREA_X_AXIS_BARE = {
  type: "category" as const,
  boundaryGap: false,
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { show: false },
};

// The y-axis chrome (line / ticks / value labels) is hidden, but the
// horizontal split gridlines stay on — mirroring the upstream recipe's
// `<CartesianGrid vertical={false} />` (faint horizontal-only gridlines) over
// an otherwise label-less value axis. Note the engine skips a whole axis when
// `show: false`, taking its splitLine with it, so the chrome must be hidden
// per sub-component instead of via `show: false`.
export const CHART_AREA_Y_AXIS_HIDDEN = {
  type: "value" as const,
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { show: false },
  splitLine: { show: true },
};

export function formatShortMonthDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ─── Tooltip formatter ─────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Upstream ChartTooltipContent (registry/new-york-v4/ui/chart.tsx ~207-262)
// renders each series as ONE flex row: the color swatch + the series name in
// muted-foreground on the LEFT, and the value pushed to the RIGHT edge as
// monospace / weight-500 / tabular-nums in the panel's full foreground. The
// panel carries `min-w-[8rem]`, which is what lets the value right-align even
// for a single-series tooltip. Reproduced here with fixed theme tokens (muted
// name = neutral shift-9; the value inherits the engine tooltip's shift-10
// foreground) — the same approach as chart-tooltip-shared.ts.
const TOOLTIP_MUTED_COLOR = themeColorToken(null, "shift-9", "neutral");

/** One tooltip series row: swatch + muted name (left), mono value (right). */
export function chartAreaTooltipRow(
  swatch: string,
  label: string,
  value: string,
): string {
  return (
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">` +
    `<span style="display:flex;align-items:center;">${swatch}` +
    `<span style="color:${TOOLTIP_MUTED_COLOR};">${label}</span></span>` +
    `<span style="font-family:ui-monospace,monospace;font-weight:500;font-variant-numeric:tabular-nums;">${value}</span>` +
    `</div>`
  );
}

/** Wraps assembled tooltip rows in the upstream `min-w-[8rem]` panel. */
export function wrapChartAreaTooltip(inner: string): string {
  return `<div style="min-width:8rem;">${inner}</div>`;
}

/**
 * Builds an axis-trigger tooltip formatter that prints the hovered
 * category label (resolved from `categories[dataIndex]`, since the engine
 * does not populate `axisValueLabel` at runtime) followed by one
 * color-dot + series-name + value line per series.
 *
 * @param categories - Category labels in data order, used to resolve the
 *   hovered x position back to a readable label.
 * @param valueLabel - Optional per-series value formatter. Defaults to the
 *   plotted value. Pass a custom formatter to show raw (pre-normalized)
 *   values when the plotted series data has been transformed (e.g. percent
 *   stacking).
 * @param hideLabel - When true, the leading category header row is omitted —
 *   mirroring upstream's `<ChartTooltipContent hideLabel />` (used by the
 *   linear and step recipes).
 * @param indicator - Series color-swatch shape. `'dot'` (default) is a round
 *   swatch; `'line'` is a thin vertical bar — mirroring upstream's
 *   `<ChartTooltipContent indicator="line" />` (used by the default, icons,
 *   legend and stacked-expand recipes; the rest keep the default dot).
 */
export function chartAxisTooltipFormatter(
  categories: string[],
  valueLabel: (params: TooltipParams) => string = (p) => String(p.value ?? ""),
  hideLabel = false,
  indicator: "dot" | "line" = "dot",
): (params: TooltipParams | TooltipParams[]) => string {
  return (paramsInput) => {
    const params = Array.isArray(paramsInput) ? paramsInput : [paramsInput];
    if (params.length === 0) return "";
    const category = escapeHtml(
      categories[params[0].dataIndex] ?? params[0].name ?? "",
    );
    const rows = params
      .map((p) => {
        const swatch =
          indicator === "line"
            ? `<span style="display:inline-block;width:4px;height:12px;border-radius:2px;background:${p.color};margin-right:6px;vertical-align:middle;"></span>`
            : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
        const label = escapeHtml(String(p.seriesName ?? p.name ?? ""));
        return chartAreaTooltipRow(swatch, label, escapeHtml(valueLabel(p)));
      })
      .join("");
    // Upstream tooltipLabel is `font-medium` = weight 500 (chart.tsx), not bold.
    const header = hideLabel
      ? ""
      : `<div style="font-weight:500;margin-bottom:4px;">${category}</div>`;
    return wrapChartAreaTooltip(`${header}${rows}`);
  };
}

// ─── Trend / legend icons (24x24 grid, original geometric shapes) ──────────

const TREND_ICON_PATHS: Record<"up" | "down", DomphyElement[]> = {
  up: [
    { polyline: null, points: "3,17 9,11 13,15 21,7" },
    { polyline: null, points: "15,7 21,7 21,13" },
  ],
  down: [
    { polyline: null, points: "3,7 9,13 13,9 21,17" },
    { polyline: null, points: "15,17 21,17 21,11" },
  ],
};

export type ChartTrendDirection = "up" | "down";

/** Renders a small trend-arrow glyph inside a themed `icon()` box. */
export function chartTrendIcon(
  direction: ChartTrendDirection,
  color: ThemeColor = "neutral",
): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: TREND_ICON_PATHS[direction],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    $: [icon({ color })],
  };
}

/**
 * Small flat color swatch patch used by the plain (non-icon) legend recipe.
 * A patch (applied via `$`), not a standalone tagged element — matching the
 * same "small reusable colored primitive" idiom as @domphy/ui's own
 * decorative-fill patches (e.g. progress()'s filled track).
 */
export function chartLegendSwatch(color: ThemeColor): PartialElement {
  const colorState = toState(color, "color");
  return {
    style: {
      display: "inline-block",
      // Upstream ChartLegendContent swatch is `h-2 w-2 rounded-[2px]`
      // (8px square, 2px radius), not a 10px/4px chip.
      width: themeSpacing(2),
      height: themeSpacing(2),
      borderRadius: themeSpacing(0.5),
      flexShrink: "0",
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "shift-9", colorState.get(listener)),
      color: (listener: Listener) =>
        themeColor(listener, "shift-9", colorState.get(listener)),
    },
  };
}

// ─── Card shell (title/description → optional aside → content → footer) ───
//
// Composes directly with @domphy/ui's card() auto-placement grid: headings
// land in "title", a <p> in "desc", an <aside> in "aside" (beside the
// title/desc column — used for a header-right control like a range select),
// a <div> in "content", and a <footer> in "footer". Every child below is a
// DIRECT child of the card host div for that reason.

export interface ChartCardShellProps {
  title: string;
  description: string;
  content: DomphyElement<"div">;
  headerAside?: DomphyElement<"aside">;
  footer?: DomphyElement<"footer">;
  color?: ThemeColor;
}

export function chartCardShell(
  props: ChartCardShellProps,
): DomphyElement<"div"> {
  const {
    title,
    description,
    content,
    headerAside,
    footer,
    color = "neutral",
  } = props;
  const children: DomphyElement[] = [
    { h3: title, $: [heading()] },
    { p: description, $: [paragraph({ color: "neutral" })] },
  ];
  if (headerAside) children.push(headerAside);
  children.push(content);
  if (footer) children.push(footer);
  return {
    div: children,
    $: [card({ color })],
    style: { width: "100%" },
  };
}

export interface ChartTrendFooterProps {
  trendText: string;
  direction: ChartTrendDirection;
  captionText: string;
  color?: ThemeColor;
  trendIconOverride?: DomphyElement<"span">;
  /** Whether the trend-arrow icon is shown after the bold sentence. Defaults to `true`. */
  showIcon?: boolean;
}

/** Two-line footer: bold trend sentence + trailing trend icon, then a muted caption line. */
export function chartTrendFooter(
  props: ChartTrendFooterProps,
): DomphyElement<"footer"> {
  const {
    trendText,
    direction,
    captionText,
    // Upstream renders the icon with plain foreground/currentColor — no
    // semantic green/red tint. Callers may still override explicitly.
    color = "neutral",
    trendIconOverride,
    showIcon = true,
  } = props;
  // Upstream footer trend line is `font-medium` (weight 500) in the card's
  // FULL foreground — NOT bold (700). A plain span at 500, not strong().
  const trendRow: DomphyElement[] = [
    {
      span: trendText,
      style: {
        fontWeight: fixed("500"),
        color: (listener: Listener) => themeColor(listener, "shift-11", color),
      },
    },
  ];
  // Upstream order: sentence FIRST, then the trend icon after it
  // ("Trending up by 5.2% this month <TrendingUp />").
  if (showIcon) {
    const trendIcon = trendIconOverride ?? chartTrendIcon(direction, color);
    // Upstream's footer <TrendingUp/> has no color class, so it inherits the
    // trend line's FULL foreground (currentColor) — unlike the muted legend
    // icons. icon() bakes in shift-9 (muted); restore full foreground here.
    trendIcon.$ = [
      ...(trendIcon.$ ?? []),
      {
        style: {
          color: (listener: Listener) =>
            themeColor(listener, "shift-11", color),
        },
      },
    ];
    trendRow.push(trendIcon);
  }
  return {
    footer: [
      {
        div: trendRow,
        style: {
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(1.5),
        },
      },
      { small: captionText, $: [small({ color: "neutral" })] },
    ],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
  };
}

export interface ChartLegendEntry {
  label: string;
  color: ThemeColor;
  icon?: ChartTrendDirection;
}

/** Centered swatch/icon + label row shown below the chart plot. */
export function chartLegendRow(
  entries: ChartLegendEntry[],
): DomphyElement<"div"> {
  return {
    div: entries.map((entry) => ({
      span: [
        entry.icon
          ? chartTrendIcon(entry.icon, entry.color)
          : ({
              span: null,
              $: [chartLegendSwatch(entry.color)],
            } as DomphyElement<"span">),
        // Upstream ChartLegendContent label is plain inherited-size FULL
        // foreground text (chart.tsx line 322) — not muted, not shrunk.
        {
          span: entry.label,
          style: {
            color: (listener: Listener) =>
              themeColor(listener, "shift-11", "neutral"),
          },
        },
      ],
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: themeSpacing(1.5),
      },
      _key: entry.label,
    })),
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: themeSpacing(4),
      paddingBlockStart: themeSpacing(3),
    },
  };
}

// ─── Chart frame (mounts @domphy/chart, plays the mount-reveal wipe) ──────
//
// FIDELITY NOTE: @domphy/chart's WebGL line/area renderer has no built-in
// per-path "draw in" reveal animation (verified against packages/chart/src/
// gl/LineRenderer.ts and engine.ts — there is no animation/easing hook for
// line or area geometry). The spec's "grows from empty to full extent, ease-
// out, a few hundred ms" mount reveal is approximated here at the container
// level with a clip-path wipe driven by @domphy/ui's motion() (Web Animations
// API) instead of a true per-vertex path animation.

export const CHART_AREA_REVEAL_TRANSITION = {
  duration: 650,
  easing: "ease-out",
} as const;

export function chartAreaFrame(
  option: ChartOption | ReadableState<ChartOption>,
  heightUnits = 64,
): DomphyElement<"div"> {
  return {
    div: null,
    style: {
      width: "100%",
      height: themeSpacing(heightUnits),
    },
    $: [
      chart(option),
      motion({
        initial: { clipPath: "inset(0% 100% 0% 0%)" },
        animate: { clipPath: "inset(0% 0% 0% 0%)" },
        transition: CHART_AREA_REVEAL_TRANSITION,
      }),
    ],
  };
}
