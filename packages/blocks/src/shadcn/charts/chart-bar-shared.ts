// Shared building blocks for the shadcn "chart-bar" recipe family
// (chartBarDefault / Horizontal / Multiple / Stacked / Negative / Mixed /
// Active / Label / LabelCustom / Interactive). Not itself an exported block —
// every factory in this family composes these helpers into its own fixed,
// literal element tree.
//
// Clean-room note: this is an independent reimplementation of the public
// *behavior* described in the block specs (a card-shelled bar chart with a
// trend footer, built on top of @domphy/chart's WebGL/SVG engine). Layout,
// sample data, icon artwork and code are original. Follows the same
// self-contained-per-family convention already used by chart-area-shared.ts,
// chart-line-shared.ts, pie-chart-shared.ts and chart-radial-shared.ts.
//
// @domphy/chart engine notes learned while building this family (see
// packages/chart/src/gl/BarRenderer.ts, overlay/axes.ts, overlay/labels.ts):
//
//   - BarRenderer hardcodes a 2px corner radius for every bar and never reads
//     a series' or a data item's `itemStyle.borderRadius`, `borderWidth`,
//     `borderColor` or `borderType` — only `itemStyle.color` is honored per
//     data item. So recipes that ask for a specific corner radius or a
//     dashed/solid stroke outline cannot get one from the real bar geometry;
//     an outline that needs to look different from every other bar (the
//     "active" bar recipe) is instead drawn as a companion SVG `<rect>`
//     overlay, positioned with the SAME public scale factories the engine
//     itself uses (createOrdinalScale/createLinearScale, both exported from
//     "@domphy/chart") against an explicit, fixed-pixel `grid` — so as long
//     as the same grid margins and value domain are also passed to the
//     `chart()` option, the overlay lands exactly on the rendered bar.
//   - AxisLabelOption.formatter is declared on the type but is never read by
//     the axis renderer (only `scale.format(tick)`, i.e. the raw tick string,
//     is drawn) — verified against overlay/axes.ts. Recipes that need
//     formatted axis tick text (e.g. "Apr 1" instead of a raw ISO date)
//     therefore pre-format the category *strings themselves* before handing
//     them to `xAxis.data`/`yAxis.data`, instead of relying on the formatter
//     hook.
//   - The axis-trigger tooltip's mouse→data mapping (engine.ts
//     bindTooltipEvents) always resolves the hovered point by comparing the
//     mouse's X pixel against the X SCALE, unconditionally — correct for
//     vertical bars (category axis on X) but not meaningful for horizontal
//     bars (category axis on Y, so hovering should compare mouse Y against
//     the Y scale instead). There is also no item-trigger hit-testing for bar
//     series. So every horizontal-orientation recipe in this family disables
//     the built-in tooltip (`tooltip: { show: false }`) and implements its
//     own mouse-to-row mapping + floating tooltip via a companion overlay
//     (`chartBarHorizontalHoverOverlay` below), using the same public scale
//     factories against the same fixed-pixel grid.
//   - `barGap`/`barCategoryGap` are declared on BarSeriesOption but never
//     read by BarRenderer (bar/group spacing is a fixed internal ratio), so
//     this family does not expose them as recipe props — there would be
//     nothing for them to control.
//   - Grid category axes on the Y dimension render bottom-to-top: the first
//     entry of `categories` lands at the bottom, the last at the top (see
//     coord/grid.ts, "y runs bottom to top in data, so flip"). Horizontal
//     recipes below pass `categories`/`values` in reverse-chronological order
//     so the on-screen reading order (top-to-bottom) ends up chronological.

import type { AxisOption, ChartOption, TooltipParams } from "@domphy/chart";
import {
  chart,
  createLinearScale,
  createOrdinalScale,
  familyHex,
} from "@domphy/chart";
import type {
  DomphyElement,
  Listener,
  PartialElement,
  ReadableState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeColorToken,
  themeSpacing,
} from "@domphy/theme";
import { card, heading, icon, motion, paragraph, small } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";

// ─── Data shapes ───────────────────────────────────────────────────────────

export interface ChartBarPoint {
  label: string;
  value: number;
}

export interface ChartBarTwoSeriesPoint {
  label: string;
  desktop: number;
  mobile: number;
}

export interface ChartBarCategoryPoint {
  category: string;
  value: number;
  color?: ThemeColor;
}

export interface ChartBarDailyPoint {
  date: string; // "YYYY-MM-DD"
  desktop: number;
  mobile: number;
}

// ─── Original sample datasets (invented for this port) ────────────────────

export const CHART_BAR_MONTHLY_DATA: ChartBarPoint[] = [
  { label: "Jan", value: 173 },
  { label: "Feb", value: 305 },
  { label: "Mar", value: 237 },
  { label: "Apr", value: 73 },
  { label: "May", value: 209 },
  { label: "Jun", value: 214 },
];

export const CHART_BAR_TWO_SERIES_DATA: ChartBarTwoSeriesPoint[] = [
  { label: "Jan", desktop: 186, mobile: 80 },
  { label: "Feb", desktop: 305, mobile: 200 },
  { label: "Mar", desktop: 237, mobile: 120 },
  { label: "Apr", desktop: 73, mobile: 190 },
  { label: "May", desktop: 209, mobile: 130 },
  { label: "Jun", desktop: 214, mobile: 140 },
];

export const CHART_BAR_NEGATIVE_DATA: ChartBarPoint[] = [
  { label: "Jan", value: 173 },
  { label: "Feb", value: -209 },
  { label: "Mar", value: 214 },
  { label: "Apr", value: -207 },
  { label: "May", value: 190 },
  { label: "Jun", value: -208 },
];

/** Five browser categories, each carrying its own accent color — reused by
 * both the mixed-color and the pre-emphasized "active" recipes. */
export const CHART_BAR_BROWSER_DATA: ChartBarCategoryPoint[] = [
  { category: "Chrome", value: 275, color: "primary" },
  { category: "Safari", value: 200, color: "secondary" },
  { category: "Firefox", value: 187, color: "success" },
  { category: "Edge", value: 173, color: "warning" },
  { category: "Other", value: 90, color: "info" },
];

// Anchored to the dataset's own latest date (not the real current date) so
// the block — and its tests — stay deterministic. Mirrors the convention in
// chart-area-shared.ts's CHART_AREA_DAILY_END_DATE.
export const CHART_BAR_DAILY_END_DATE = "2026-06-29";

// Deterministic (non-random) PRNG so the generated daily dataset is stable
// across runs/tests, unlike Math.random().
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ~3 months of made-up daily visitor counts (desktop ~140-520, mobile
 * ~59-260), generated once from a fixed seed. */
export function generateChartBarDailyData(
  days = 92,
  endDate: string = CHART_BAR_DAILY_END_DATE,
): ChartBarDailyPoint[] {
  const random = mulberry32(20260629);
  const end = new Date(`${endDate}T00:00:00Z`);
  const points: ChartBarDailyPoint[] = [];
  let desktopLevel = 260;
  let mobileLevel = 130;
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - offset);
    const dayNumber = days - offset;
    desktopLevel = Math.max(140, desktopLevel + (random() - 0.5) * 40);
    mobileLevel = Math.max(59, mobileLevel + (random() - 0.5) * 24);
    points.push({
      date: date.toISOString().slice(0, 10),
      desktop: Math.min(
        520,
        Math.round(desktopLevel + Math.sin(dayNumber / 8) * 60),
      ),
      mobile: Math.min(
        260,
        Math.round(mobileLevel + Math.sin(dayNumber / 10) * 30),
      ),
    });
  }
  return points;
}

export const CHART_BAR_DAILY_DATA: ChartBarDailyPoint[] =
  generateChartBarDailyData();

// ─── Color helpers ─────────────────────────────────────────────────────────

// Series color rotation the engine's own default palette follows (see
// packages/chart/src/gl/color.ts SERIES_PALETTE) — recipes assign explicit
// per-series colors in this same order so the rendered fill and the (engine-
// controlled, rotation-index-based) tooltip dot stay visually consistent.
export const CHART_BAR_SERIES_PALETTE: ThemeColor[] = [
  "primary",
  "secondary",
  "success",
  "warning",
  "info",
];

/** Resolves a theme color role to a literal hex via themeColorToken/familyHex
 * — required for per-data-item `itemStyle.color`, which BarRenderer parses
 * as a hex string (not a reactive theme function). This is the closest a
 * per-item chart-option color can get to "theme token, not a hardcoded
 * literal" — mirrors chart-area-shared.ts's chartColorRgba() rationale. */
export function chartBarColorHex(role: ThemeColor, tone = "shift-9"): string {
  return familyHex(role, tone);
}

// ─── Axis presets ──────────────────────────────────────────────────────────

/** Vertical-bar category (x) axis: labels only, no line/ticks. */
export function chartBarCategoryXAxis(
  categories: string[],
  options: { splitLine?: boolean } = {},
): AxisOption {
  return {
    type: "category",
    data: categories,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: true },
    splitLine: { show: options.splitLine ?? false },
  };
}

/** Vertical-bar value (y) axis: no visible ink, optional gridlines. */
export function chartBarHiddenValueYAxis(
  options: { splitLine?: boolean; min?: number; max?: number } = {},
): AxisOption {
  return {
    type: "value",
    min: options.min,
    max: options.max,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { show: options.splitLine ?? true },
  };
}

/** Horizontal-bar category (y) axis: labels only, no line/ticks. */
export function chartBarCategoryYAxis(categories: string[]): AxisOption {
  return {
    type: "category",
    data: categories,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: true },
    splitLine: { show: false },
  };
}

/** Horizontal-bar value (x) axis: no visible ink, optional gridlines. */
export function chartBarHiddenValueXAxis(
  options: { splitLine?: boolean; min?: number; max?: number } = {},
): AxisOption {
  return {
    type: "value",
    min: options.min ?? 0,
    max: options.max,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { show: options.splitLine ?? false },
  };
}

// ─── Value domain helpers ───────────────────────────────────────────────────

/** A zero-anchored, padded value domain — pass the SAME numbers to both the
 * chart()'s axis.min/max and any companion overlay's scale so bar geometry
 * (real WebGL bar + SVG overlay) stays pixel-in-sync. */
export function chartBarValueDomain(
  values: number[],
  padFraction = 0.12,
): [number, number] {
  const max = Math.max(0, ...values);
  return [0, Math.ceil(max * (1 + padFraction)) || 1];
}

/** A signed, padded value domain for diverging (positive/negative) bars. */
export function chartBarSignedDomain(
  values: number[],
  padFraction = 0.2,
): [number, number] {
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  return [
    Math.floor(min - span * padFraction),
    Math.ceil(max + span * padFraction),
  ];
}

// ─── Tooltip formatters ─────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * One upstream ChartTooltipContent item row (ui/chart.tsx ~243-262): the
 * indicator `swatch`, then the series NAME on the left in muted-foreground at
 * normal weight, then the VALUE pushed to the right edge as font-mono,
 * font-weight 500, tabular-nums in FULL foreground. `swatch` is trusted HTML;
 * `name`/`value` must already be escaped. Pass `""` for the swatch to omit the
 * indicator (upstream `hideIndicator`).
 */
export function chartBarTooltipRow(
  swatch: string,
  name: string,
  value: string,
): string {
  const muted = themeColorToken(null, "shift-9", "neutral");
  const foreground = themeColorToken(null, "shift-11", "neutral");
  return (
    `<span style="display:flex;align-items:center;">${swatch}` +
    `<span style="color:${muted};">${name}</span>` +
    `<span style="margin-left:auto;padding-left:12px;` +
    `font-family:ui-monospace,SFMono-Regular,Menlo,monospace;` +
    `font-weight:500;font-variant-numeric:tabular-nums;color:${foreground};">${value}</span>` +
    `</span>`
  );
}

/**
 * Builds an axis-trigger tooltip formatter that prints the hovered category
 * label (resolved from `categories[dataIndex]`, since the engine does not
 * populate `axisValueLabel` at runtime) followed by one color-dot +
 * series-name + value line per series. Pass `hideLabel: true` to omit the
 * category header row (mirrors upstream's `<ChartTooltipContent hideLabel />`).
 */
export function chartBarAxisTooltipFormatter(
  categories: string[],
  valueLabel: (parameters: TooltipParams) => string = (p) =>
    String(p.value ?? ""),
  options: { hideLabel?: boolean } = {},
): (parameters: TooltipParams | TooltipParams[]) => string {
  const { hideLabel = false } = options;
  return (parametersInput) => {
    const parameters = Array.isArray(parametersInput)
      ? parametersInput
      : [parametersInput];
    if (parameters.length === 0) return "";
    const rows = parameters
      .map((p) => {
        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
        const label = escapeHtml(String(p.seriesName ?? p.name ?? ""));
        return chartBarTooltipRow(dot, label, escapeHtml(valueLabel(p)));
      })
      .join("");
    if (hideLabel) return rows;
    const category = escapeHtml(
      categories[parameters[0].dataIndex] ?? parameters[0].name ?? "",
    );
    return `<strong>${category}</strong>${rows}`;
  };
}

export interface ChartBarStackedSeriesMeta {
  key: string;
  label: string;
}

/** Axis-trigger tooltip for a stacked bar: one swatch+label+value row per
 * segment, plus an appended total row. */
export function chartBarStackedTooltipFormatter(
  categories: string[],
  showTotal = true,
): (parameters: TooltipParams | TooltipParams[]) => string {
  return (parametersInput) => {
    const parameters = Array.isArray(parametersInput)
      ? parametersInput
      : [parametersInput];
    if (parameters.length === 0) return "";
    const category = escapeHtml(
      categories[parameters[0].dataIndex] ?? parameters[0].name ?? "",
    );
    const rows = parameters.map((p) => {
      const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
      const label = escapeHtml(String(p.seriesName ?? p.name ?? ""));
      return chartBarTooltipRow(dot, label, escapeHtml(String(p.value ?? "")));
    });
    if (showTotal) {
      const total = parameters.reduce(
        (sum, p) => sum + (Number(p.value) || 0),
        0,
      );
      rows.push(chartBarTooltipRow("", "Total", escapeHtml(String(total))));
    }
    return `<strong>${category}</strong>${rows.join("")}`;
  };
}

/** Axis-trigger tooltip that prints the category label and a signed value
 * (e.g. "+173" / "-209") — used by the diverging (negative-aware) recipe. */
export function chartBarSignedTooltipFormatter(
  categories: string[],
): (parameters: TooltipParams | TooltipParams[]) => string {
  return (parametersInput) => {
    const parameters = Array.isArray(parametersInput)
      ? parametersInput
      : [parametersInput];
    if (parameters.length === 0) return "";
    const point = parameters[0];
    const category = escapeHtml(
      categories[point.dataIndex] ?? point.name ?? "",
    );
    const value = Number(point.value) || 0;
    const sign = value > 0 ? "+" : "";
    return chartBarTooltipRow(
      "",
      category,
      `${sign}${escapeHtml(String(value))}`,
    );
  };
}

// ─── Trend / legend icon (24x24 grid, original geometric shape) ───────────

const TREND_ICON_PATHS: Record<"up" | "down", DomphyElement[]> = {
  up: [
    { polyline: null, points: "3,18 10,11 14,15 21,6" },
    { polyline: null, points: "15,6 21,6 21,12" },
  ],
  down: [
    { polyline: null, points: "3,6 10,13 14,9 21,18" },
    { polyline: null, points: "15,18 21,18 21,12" },
  ],
};

export type ChartTrendDirection = "up" | "down";

/** Renders a small trend-arrow glyph inside a themed `icon()` box. */
export function chartBarTrendIcon(
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

/** Small flat color swatch patch used by the plain legend recipe. */
export function chartBarLegendSwatch(color: ThemeColor): PartialElement {
  return {
    style: {
      display: "inline-block",
      width: themeSpacing(2.5),
      height: themeSpacing(2.5),
      borderRadius: themeSpacing(1),
      flexShrink: "0",
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "shift-9", color),
      color: (listener: Listener) => themeColor(listener, "shift-9", color),
    },
  };
}

export interface ChartBarLegendEntry {
  label: string;
  color: ThemeColor;
}

/** Centered swatch + label row shown below a chart's plot. */
export function chartBarLegendRow(
  entries: ChartBarLegendEntry[],
): DomphyElement<"div"> {
  return {
    div: entries.map((entry) => ({
      span: [
        {
          span: null,
          $: [chartBarLegendSwatch(entry.color)],
        } as DomphyElement<"span">,
        { small: entry.label, $: [small({ color: "neutral" })] },
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

// ─── Card shell (title/subtitle → optional aside → content → footer) ──────
//
// Composes directly with @domphy/ui's card() auto-placement grid: headings
// land in "title", a <p> in "desc" (used here as the header subtitle), an
// <aside> in "aside" (beside the title/desc column — the interactive
// recipe's tab-toggle header), a <div> in "content", and a <footer> in
// "footer". Every child below is a DIRECT child of the card host div.

export interface ChartBarCardShellProps {
  title: string;
  subtitle: string;
  content: DomphyElement<"div">;
  headerAside?: DomphyElement<"aside">;
  footer?: DomphyElement<"footer">;
  color?: ThemeColor;
}

export function chartBarCardShell(
  props: ChartBarCardShellProps,
): DomphyElement<"div"> {
  const {
    title,
    subtitle,
    content,
    headerAside,
    footer,
    color = "neutral",
  } = props;
  const children: DomphyElement[] = [
    { h3: title, $: [heading()] },
    { p: subtitle, $: [paragraph({ color: "neutral" })] },
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

export interface ChartBarTrendFooterProps {
  trendText: string;
  direction: ChartTrendDirection;
  captionText: string;
  color?: ThemeColor;
  showIcon?: boolean;
}

/** Two-line footer: trend sentence + trailing icon, then a muted caption line.
 * Upstream footer trend line is `<div className="... font-medium">` — weight
 * 500 (NOT bold/700) in FULL card foreground, sentence FIRST then a plain trend
 * glyph AFTER it ("Trending up by 5.2% this month <TrendingUp/>"), the icon
 * inheriting that SAME full-foreground currentColor (no success/danger tint,
 * and NOT the muted 'neutral'/shift-9 tone icon() paints by default — only the
 * caption line below is muted). */
export function chartBarTrendFooter(
  props: ChartBarTrendFooterProps,
): DomphyElement<"footer"> {
  const {
    trendText,
    direction,
    captionText,
    color = "neutral",
    showIcon = true,
  } = props;
  const foreground = (listener: Listener) =>
    themeColor(listener, "shift-11", "neutral");
  const trendRow: DomphyElement[] = [
    { span: trendText, style: { fontWeight: fixed("500"), color: foreground } },
  ];
  if (showIcon) {
    const trendIcon = chartBarTrendIcon(direction, color);
    // Icon inherits the sentence's full-foreground currentColor. icon() alone
    // paints shift-9 muted; the element's own style wins over the patch style
    // (native-win merge), so this overrides only the color and keeps its box.
    trendIcon.style = { color: foreground };
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

// ─── Chart frame (mounts @domphy/chart, plays the mount-reveal wipe) ──────
//
// FIDELITY NOTE: @domphy/chart's WebGL bar renderer has no built-in
// per-bar "grow from zero" reveal animation (verified against
// packages/chart/src/gl/BarRenderer.ts — bar geometry is uploaded and drawn
// in one pass, no animation/easing hook). The spec's "bars tween height from
// 0 on mount, ease-out" is approximated here at the container level with a
// clip-path wipe driven by @domphy/ui's motion() (Web Animations API)
// instead of a true per-bar height tween.

export const CHART_BAR_REVEAL_TRANSITION = {
  duration: 700,
  easing: "ease-out",
} as const;

export interface ChartBarFrameOptions {
  height?: number;
  overlays?: PartialElement[];
}

export function chartBarFrame(
  option: ChartOption | ReadableState<ChartOption>,
  options: ChartBarFrameOptions = {},
): DomphyElement<"div"> {
  const { height = 64, overlays = [] } = options;
  const children: DomphyElement[] = [
    {
      div: null,
      style: { position: "absolute", inset: "0" },
      $: [chart(option)],
    } as DomphyElement<"div">,
  ];
  overlays.forEach((overlayPatch, index) => {
    children.push({
      div: null,
      _key: `overlay-${index}`,
      $: [overlayPatch],
    } as DomphyElement<"div">);
  });
  return {
    div: children,
    style: {
      position: "relative",
      width: "100%",
      height: themeSpacing(height),
    },
    $: [
      motion({
        initial: { clipPath: "inset(0% 100% 0% 0%)" },
        animate: { clipPath: "inset(0% 0% 0% 0%)" },
        transition: CHART_BAR_REVEAL_TRANSITION,
      }),
    ],
  };
}

// ─── Fixed-pixel grid (shared between the real chart() option and every
// companion SVG overlay below, so bar geometry stays pixel-in-sync) ───────

export interface ChartBarGrid {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// ─── SVG overlay helpers ────────────────────────────────────────────────────

function svgTextNode(
  content: string,
  x: number,
  y: number,
  attributes: Record<string, string | number>,
): SVGTextElement {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  ) as SVGTextElement;
  element.textContent = content;
  element.setAttribute("x", String(x));
  element.setAttribute("y", String(y));
  for (const [key, value] of Object.entries(attributes))
    element.setAttribute(key, String(value));
  return element;
}

function createOverlaySvg(container: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.overflow = "visible";
  container.appendChild(svg);
  return svg;
}

export interface ChartBarHorizontalHoverOverlayProps {
  categories: string[];
  grid: ChartBarGrid;
  showCategoryTitle?: boolean;
  valueLabel: (index: number) => string;
}

/**
 * A floating tooltip (visually matching @domphy/chart's own tooltip chrome)
 * that tracks the nearest ROW under the cursor for horizontal-orientation
 * bar charts — a stand-in for the engine's built-in tooltip, which cannot
 * resolve hover position correctly for that orientation (see the file-level
 * fidelity note above).
 */
export function chartBarHorizontalHoverOverlay(
  props: ChartBarHorizontalHoverOverlayProps,
): PartialElement {
  const { categories, grid, showCategoryTitle = false, valueLabel } = props;
  return {
    style: { position: "absolute", inset: "0", pointerEvents: "none" },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const wrapper = container.parentElement;
      if (!wrapper) return;

      const tooltip = document.createElement("div");
      tooltip.style.cssText = [
        "position:absolute",
        "pointer-events:none",
        "z-index:9999",
        "padding:8px 12px",
        "border-radius:6px",
        "font-size:12px",
        "line-height:1.6",
        "box-shadow:0 4px 16px rgba(0,0,0,0.18)",
        "transition:opacity 0.12s ease",
        "opacity:0",
        "white-space:nowrap",
        `background:${themeColorToken(null, "shift-0", "neutral")}`,
        `border:1px solid ${themeColorToken(null, "shift-3", "neutral")}`,
        `color:${themeColorToken(null, "shift-10", "neutral")}`,
      ].join(";");
      container.appendChild(tooltip);

      function onMove(event: MouseEvent): void {
        const rect = wrapper!.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const gridTop = grid.top;
        const gridBottom = rect.height - grid.bottom;
        if (
          mouseX < grid.left ||
          mouseX > rect.width - grid.right ||
          mouseY < gridTop ||
          mouseY > gridBottom
        ) {
          tooltip.style.opacity = "0";
          return;
        }

        const yScale = createOrdinalScale(categories, [gridBottom, gridTop]);
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < categories.length; index++) {
          const distance = Math.abs(yScale.map(index) - mouseY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        }

        tooltip.innerHTML = showCategoryTitle
          ? `<strong>${categories[nearestIndex]}</strong><br>${valueLabel(nearestIndex)}`
          : valueLabel(nearestIndex);
        tooltip.style.opacity = "1";

        let left = mouseX + 14;
        const top = mouseY - 12;
        if (left + 140 > rect.width) left = mouseX - 154;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      }
      function onLeave(): void {
        tooltip.style.opacity = "0";
      }

      wrapper.addEventListener("mousemove", onMove);
      wrapper.addEventListener("mouseleave", onLeave);
      node.addHook("Remove", () => {
        wrapper!.removeEventListener("mousemove", onMove);
        wrapper!.removeEventListener("mouseleave", onLeave);
        tooltip.remove();
      });
    },
  };
}

export interface ChartBarActiveOverlayProps {
  categories: string[];
  values: number[];
  valueDomain: [number, number];
  grid: ChartBarGrid;
  activeIndex: number;
  color: ThemeColor;
}

/**
 * Draws a dashed-stroke rounded rect around one vertical bar's exact
 * geometry — approximates the "active" bar treatment, since BarRenderer
 * never applies a per-item stroke/dash to the real WebGL geometry (see the
 * file-level fidelity note above).
 */
export function chartBarActiveOverlay(
  props: ChartBarActiveOverlayProps,
): PartialElement {
  const { categories, values, valueDomain, grid, activeIndex, color } = props;
  return {
    style: { position: "absolute", inset: "0", pointerEvents: "none" },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const svg = createOverlaySvg(container);

      function draw(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.textContent = "";
        if (!width || !height) return;

        const xScale = createOrdinalScale(categories, [
          grid.left,
          width - grid.right,
        ]);
        const yScale = createLinearScale(valueDomain, [
          height - grid.bottom,
          grid.top,
        ]);
        const barWidth = xScale.bandwidth() * 0.65;
        const xCenter = xScale.map(activeIndex);
        const yTop = yScale.map(values[activeIndex] ?? 0);
        const baselineY = yScale.map(0);
        const rectY = Math.min(yTop, baselineY);
        const rectHeight = Math.abs(baselineY - yTop);

        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        rect.setAttribute("x", String(xCenter - barWidth / 2));
        rect.setAttribute("y", String(rectY));
        rect.setAttribute("width", String(barWidth));
        rect.setAttribute("height", String(rectHeight));
        rect.setAttribute("rx", "2");
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke", themeColorToken(null, "shift-9", color));
        rect.setAttribute("stroke-width", "2");
        // Upstream Rectangle: strokeDasharray={4} + strokeDashoffset={4}.
        rect.setAttribute("stroke-dasharray", "4");
        rect.setAttribute("stroke-dashoffset", "4");
        svg.appendChild(rect);
      }

      draw();
      const resizeObserver = new ResizeObserver(() => draw());
      resizeObserver.observe(container);
      node.addHook("Remove", () => {
        resizeObserver.disconnect();
        svg.remove();
      });
    },
  };
}

export interface ChartBarInsideOutsideLabelOverlayProps {
  categories: string[];
  values: number[];
  valueDomain: [number, number];
  grid: ChartBarGrid;
  insideColor: ThemeColor;
  insideLabel: (index: number) => string;
  outsideLabel: (index: number) => string;
}

/**
 * Draws two text labels per horizontal bar — one just inside the bar's left
 * edge (category name), one just past its right end (numeric value) — at
 * the exact geometry a single-series, non-stacked horizontal bar would use
 * in BarRenderer (bandwidth * 0.65 bar thickness, centered on the category
 * band). Needed because the engine's built-in bar-label overlay
 * (overlay/labels.ts renderBarLabels) only positions labels correctly for
 * vertical bars — see the file-level fidelity note above.
 */
export function chartBarInsideOutsideLabelOverlay(
  props: ChartBarInsideOutsideLabelOverlayProps,
): PartialElement {
  const {
    categories,
    values,
    valueDomain,
    grid,
    insideColor,
    insideLabel,
    outsideLabel,
  } = props;
  return {
    style: { position: "absolute", inset: "0", pointerEvents: "none" },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const svg = createOverlaySvg(container);
      const insideTextColor = themeColorToken(null, "shift-1", insideColor);
      const outsideTextColor = themeColorToken(null, "shift-9", "neutral");

      function draw(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.textContent = "";
        if (!width || !height) return;

        const yScale = createOrdinalScale(categories, [
          height - grid.bottom,
          grid.top,
        ]);
        const xScale = createLinearScale(valueDomain, [
          grid.left,
          width - grid.right,
        ]);
        const baselineX = xScale.map(0);

        categories.forEach((_category, index) => {
          const yCenter = yScale.map(index);
          const xRight = xScale.map(values[index] ?? 0);
          const insideX = Math.min(baselineX, xRight) + 8;
          const outsideX = Math.max(baselineX, xRight) + 8;

          svg.appendChild(
            svgTextNode(insideLabel(index), insideX, yCenter, {
              fill: insideTextColor,
              "font-size": 12,
              "text-anchor": "start",
              "dominant-baseline": "middle",
            }),
          );
          svg.appendChild(
            svgTextNode(outsideLabel(index), outsideX, yCenter, {
              fill: outsideTextColor,
              "font-size": 12,
              "text-anchor": "start",
              "dominant-baseline": "middle",
            }),
          );
        });
      }

      draw();
      const resizeObserver = new ResizeObserver(() => draw());
      resizeObserver.observe(container);
      node.addHook("Remove", () => {
        resizeObserver.disconnect();
        svg.remove();
      });
    },
  };
}

export interface ChartBarSignedLabelOverlayProps {
  categories: string[];
  values: number[];
  valueDomain: [number, number];
  grid: ChartBarGrid;
}

/**
 * Draws each bar's category name just outside its tip — above for positive
 * bars, below for negative ones — instead of a conventional axis row. Built
 * as a companion overlay (rather than the engine's `label` option) so the
 * offset direction can flip per data point's sign.
 */
export function chartBarSignedLabelOverlay(
  props: ChartBarSignedLabelOverlayProps,
): PartialElement {
  const { categories, values, valueDomain, grid } = props;
  return {
    style: { position: "absolute", inset: "0", pointerEvents: "none" },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const svg = createOverlaySvg(container);
      const labelColor = themeColorToken(null, "shift-9", "neutral");

      function draw(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.textContent = "";
        if (!width || !height) return;

        const xScale = createOrdinalScale(categories, [
          grid.left,
          width - grid.right,
        ]);
        const yScale = createLinearScale(valueDomain, [
          height - grid.bottom,
          grid.top,
        ]);

        categories.forEach((category, index) => {
          const value = values[index] ?? 0;
          const xCenter = xScale.map(index);
          const yTip = yScale.map(value);
          const isPositive = value >= 0;
          const labelY = isPositive ? yTip - 8 : yTip + 16;
          svg.appendChild(
            svgTextNode(category, xCenter, labelY, {
              fill: labelColor,
              "font-size": 11,
              "text-anchor": "middle",
            }),
          );
        });
      }

      draw();
      const resizeObserver = new ResizeObserver(() => draw());
      resizeObserver.observe(container);
      node.addHook("Remove", () => {
        resizeObserver.disconnect();
        svg.remove();
      });
    },
  };
}
