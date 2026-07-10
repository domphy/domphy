// shadcn/ui "charts/line" block family — clean-room reimplementation.
//
// Shared sample data, card scaffold, footer/trend icon and a couple of small
// SVG overlay helpers reused by every `chartLine*` recipe in this folder.
//
// Why the overlays exist: @domphy/chart's built-in line-series dot renderer
// draws one uniform (white-fill, series-stroke) circle per point and has no
// per-point styling hook or hover callback, so recipes that need per-point
// colors/icons (chartLineDotsColors, chartLineDotsCustom, chartLineLabelCustom)
// or a hover-enlarging marker (chartLineDots, chartLineLabel) draw a companion
// SVG layer on top of the `chart()` canvas. That layer is positioned with the
// SAME public scale factories the engine itself uses (`createOrdinalScale`/
// `createLinearScale`, both exported from `@domphy/chart`) against an
// explicit, fixed-pixel `grid` — so as long as the exact same grid margins and
// y-domain are also passed to the `chart()` option, the overlay's points land
// exactly on the rendered line with no guesswork about internal margins.
//
// Implemented purely from the block family's public functional/visual spec —
// no upstream shadcn/ui source was viewed or copied. Sample numbers below are
// original placeholder data, not sourced from upstream.

import type { AxisOption, ChartOption, TooltipParams } from "@domphy/chart";
import { chart, createLinearScale, createOrdinalScale } from "@domphy/chart";
import type { DomphyElement, PartialElement } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeColorToken,
  themeSpacing,
} from "@domphy/theme";
import { card, heading, icon, motion, paragraph, small } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";

// ─── Sample datasets ──────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string;
  desktop: number;
  mobile: number;
}

/** Six months of made-up visitor counts — two numeric fields per point so the
 * "multiple series" recipe has a second line to draw and the single-line
 * recipes can demonstrate they only draw `desktop` (the unused `mobile` field
 * mirrors the spec's "second unused numeric field" note). */
export const MONTHLY_VISITOR_DATA: MonthlyPoint[] = [
  { month: "Jan", desktop: 142, mobile: 58 },
  { month: "Feb", desktop: 231, mobile: 96 },
  { month: "Mar", desktop: 198, mobile: 121 },
  { month: "Apr", desktop: 267, mobile: 87 },
  { month: "May", desktop: 178, mobile: 143 },
  { month: "Jun", desktop: 289, mobile: 156 },
];

export interface CategoryPoint {
  key: string;
  label: string;
  value: number;
  color: ThemeColor;
}

/** Five made-up browser/platform categories, each with its own marker color. */
export const BROWSER_CATEGORY_DATA: CategoryPoint[] = [
  { key: "chrome", label: "Chrome", value: 487, color: "primary" },
  { key: "safari", label: "Safari", value: 312, color: "secondary" },
  { key: "firefox", label: "Firefox", value: 176, color: "warning" },
  { key: "edge", label: "Edge", value: 143, color: "info" },
  { key: "other", label: "Other", value: 98, color: "success" },
];

export interface DailyPoint {
  date: string; // ISO yyyy-mm-dd
  desktop: number;
  mobile: number;
}

// Deterministic PRNG (mulberry32) — fixed seed so the generated dataset is
// stable across runs/tests, unlike Math.random().
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

function buildDailyVisitorData(): DailyPoint[] {
  const random = mulberry32(20260702);
  const points: DailyPoint[] = [];
  const start = Date.UTC(2026, 3, 1); // April 1
  let desktopLevel = 180;
  let mobileLevel = 90;
  for (let index = 0; index < 90; index++) {
    desktopLevel = Math.max(60, desktopLevel + (random() - 0.48) * 12);
    mobileLevel = Math.max(30, mobileLevel + (random() - 0.48) * 8);
    const date = new Date(start + index * 86400000);
    points.push({
      date: date.toISOString().slice(0, 10),
      desktop: Math.round(desktopLevel + Math.sin(index / 9) * 20),
      mobile: Math.round(mobileLevel + Math.sin(index / 11) * 12),
    });
  }
  return points;
}

/** ~3 months (90 points) of made-up daily visitor counts, generated once from
 * a fixed seed so the dataset is stable across renders/tests. */
export const DAILY_VISITOR_DATA: DailyPoint[] = buildDailyVisitorData();

// ─── Grid/axis helpers ────────────────────────────────────────────────────────

export interface FixedGrid {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Default plot margins (px) — enough bottom room for month-abbreviation
 * x-axis labels, no left/right room needed since the y-axis is hidden. */
export const DEFAULT_LINE_GRID: FixedGrid = {
  left: 12,
  right: 12,
  top: 12,
  bottom: 28,
};

/** Extra top margin so a value label sitting above the topmost point isn't
 * clipped by the card edge. */
export const LABELED_LINE_GRID: FixedGrid = {
  left: 12,
  right: 12,
  top: 28,
  bottom: 28,
};

/** Extra top/side margin and no bottom room — used when the x-axis is fully
 * hidden (categorical recipes with per-point colored markers). */
export const HIDDEN_AXIS_LINE_GRID: FixedGrid = {
  left: 24,
  right: 24,
  top: 28,
  bottom: 12,
};

/** Pads a value domain by 15% on both ends so the line never touches the
 * plot's top/bottom edge. Pass the SAME numbers to both the chart()'s
 * `yAxis.min`/`max` and any companion overlay's `yDomain` so they stay in
 * pixel-perfect sync (an explicit axis.min/max makes the engine skip its own
 * default padding, so there is exactly one padding formula to reason about). */
export function computeYDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max || 1;
  return [
    Math.max(0, Math.floor(min - span * 0.15)),
    Math.ceil(max + span * 0.15),
  ];
}

/** A y-axis that reserves no visible ink (no line/ticks/labels) but still
 * draws its horizontal split lines as the plot's backdrop grid. */
export function hiddenLabelYAxis(domain: [number, number]): AxisOption {
  return {
    type: "value",
    min: domain[0],
    max: domain[1],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { show: true },
  };
}

/** A category x-axis with month/day labels, no axis line, no tick marks and
 * no vertical split lines (grid stays horizontal-only). */
export function monthCategoryXAxis(categories: string[]): AxisOption {
  return {
    type: "category",
    data: categories,
    boundaryGap: false,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: true },
    splitLine: { show: false },
  };
}

/** A fully hidden x-axis — used by the categorical recipes where no x labels
 * render at all (only the horizontal gridlines remain visible). */
export function hiddenXAxis(categories: string[]): AxisOption {
  return { type: "category", data: categories, show: false };
}

// ─── Card scaffold ────────────────────────────────────────────────────────────

export const CHART_CARD_WIDTH = themeSpacing(112); // ≈ 448px at default density

export interface ChartCardProps {
  title: string;
  description: string;
  plot: DomphyElement;
  footer?: DomphyElement<"footer">;
  aside?: DomphyElement<"aside">;
  width?: string;
}

/** Wraps a chart plot in the standard card chrome: bold title + muted
 * description header, a content region holding the plot, and an optional
 * footer/aside (aside sits beside the title — used by the interactive
 * recipe's stat-tile row). */
export function chartCard(props: ChartCardProps): DomphyElement<"div"> {
  const {
    title,
    description,
    plot,
    footer,
    aside,
    width = CHART_CARD_WIDTH,
  } = props;
  const children: DomphyElement[] = [
    { h3: title, $: [heading()] } as DomphyElement<"h3">,
    {
      p: description,
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement<"p">,
  ];
  if (aside) children.push(aside);
  children.push({ div: [plot] } as DomphyElement<"div">);
  if (footer) children.push(footer);
  return {
    div: children,
    $: [card({ color: "neutral" })],
    style: { width: "100%", maxWidth: width },
  } as DomphyElement<"div">;
}

// ─── Trend footer + icon ──────────────────────────────────────────────────────

const TREND_GLYPH: Record<"up" | "down", DomphyElement[]> = {
  up: [
    { polyline: null, points: "3,17 9,11 13,15 21,5" },
    { polyline: null, points: "15,5 21,5 21,11" },
  ],
  down: [
    { polyline: null, points: "3,7 9,13 13,9 21,19" },
    { polyline: null, points: "15,19 21,19 21,13" },
  ],
};

// Upstream renders `<TrendingUp className="h-4 w-4" />` with no color class, so
// the arrow inherits the footer's full-foreground text color — NO green/red
// semantic tint and NOT the muted point-label tone. `icon()` sizes/centers the
// box but always paints the muted `shift-9` tone, so override the span's own
// color to the `shift-11` foreground tone (native style wins over the patch).
function trendGlyphIcon(
  direction: "up" | "down",
  color?: ThemeColor,
): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: TREND_GLYPH[direction],
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
    style: {
      color: (listener) => themeColor(listener, "shift-11", color ?? "neutral"),
    },
    $: [icon(color ? { color } : {})],
  };
}

export interface TrendFooterProps {
  headline: string;
  subtitle: string;
  direction?: "up" | "down";
}

/** A card footer: a medium-weight "trend went up/down N%" line with an arrow
 * glyph, and a smaller muted sentence underneath. */
export function trendFooter(props: TrendFooterProps): DomphyElement<"footer"> {
  const { headline, subtitle, direction = "up" } = props;
  return {
    footer: [
      {
        div: [
          // Upstream footer trend line is `font-medium` (500) in FULL card
          // foreground — not bold/strong (700). Only the second caption line
          // below uses the muted tone.
          {
            span: headline,
            style: {
              fontWeight: fixed(500),
              color: (listener) => themeColor(listener, "shift-11", "neutral"),
            },
          } as DomphyElement<"span">,
          trendGlyphIcon(direction),
        ],
        style: {
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(1.5),
        },
      } as DomphyElement<"div">,
      {
        small: subtitle,
        $: [small({ color: "neutral" })],
      } as DomphyElement<"small">,
    ],
    style: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: themeSpacing(1),
    },
  } as DomphyElement<"footer">;
}

// ─── Tooltip formatters ───────────────────────────────────────────────────────
//
// These build small HTML fragments consumed by @domphy/chart's TooltipOption
// `formatter`, mirroring the library's own default formatter (which also
// builds a raw HTML string with an inline `background:${color}` swatch — see
// packages/chart/src/overlay/tooltip.ts). Not a Domphy element `style` object,
// so it is outside @domphy/doctor's scope; values are escaped before
// interpolation the same way the library's own formatter does.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstTooltipParam(
  params: TooltipParams | TooltipParams[],
): TooltipParams | undefined {
  return Array.isArray(params) ? params[0] : params;
}

// Static light-theme tokens + a monospace stack for the raw-HTML tooltip rows
// (same static-token approach as every other raw-HTML/SVG string in this
// family — see the tooltip-formatter note above).
const TOOLTIP_MUTED = themeColorToken(null, "shift-9", "neutral");
const TOOLTIP_FOREGROUND = themeColorToken(null, "shift-11", "neutral");
const TOOLTIP_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Wraps a ready `swatch` HTML fragment + already-escaped series `label` and
 * `valueText` into the upstream ChartTooltipContent row (ui/chart.tsx
 * ~L243-262): swatch, then the series NAME on the LEFT in muted foreground at
 * normal weight, and the VALUE pushed to the RIGHT edge as monospace / medium /
 * tabular-nums in FULL foreground. */
export function tooltipRow(
  swatch: string,
  label: string,
  valueText: string,
): string {
  return (
    `<span style="display:flex;align-items:center;gap:8px;">${swatch}` +
    `<span style="display:flex;flex:1;justify-content:space-between;align-items:center;gap:16px;">` +
    `<span style="color:${TOOLTIP_MUTED};">${label}</span>` +
    `<span style="font-family:${TOOLTIP_MONO};font-weight:500;` +
    `font-variant-numeric:tabular-nums;color:${TOOLTIP_FOREGROUND};">${valueText}</span>` +
    `</span></span>`
  );
}

/** Bare numeric value, no swatch, no series/date label. */
export function bareValueTooltipFormatter(
  params: TooltipParams | TooltipParams[],
): string {
  const point = firstTooltipParam(params);
  if (!point) return "";
  return escapeHtml(String(point.value ?? ""));
}

/** A small vertical-line color swatch + the bare numeric value. */
export function lineSwatchValueTooltipFormatter(
  params: TooltipParams | TooltipParams[],
): string {
  const point = firstTooltipParam(params);
  if (!point) return "";
  const swatch = `<span style="display:inline-block;width:3px;height:12px;border-radius:2px;background:${point.color};margin-right:6px;vertical-align:middle;"></span>`;
  return `${swatch}${escapeHtml(String(point.value ?? ""))}`;
}

/** A small vertical-line color swatch + muted series label on the left + the
 * value pushed right (monospace/medium/foreground) — the upstream row. */
export function lineSwatchLabelValueTooltipFormatter(
  params: TooltipParams | TooltipParams[],
): string {
  const point = firstTooltipParam(params);
  if (!point) return "";
  const swatch = `<span style="display:inline-block;width:3px;height:12px;border-radius:2px;background:${point.color};"></span>`;
  const label = escapeHtml(String(point.seriesName ?? point.name ?? ""));
  return tooltipRow(swatch, label, escapeHtml(String(point.value ?? "")));
}

// ─── Mount reveal animation ───────────────────────────────────────────────────

/** Approximates "the line draws in left-to-right" on mount: @domphy/chart
 * renders series through a WebGL canvas (no SVG `<path>` to animate
 * `stroke-dasharray` on), so instead the whole plot (grid + axis + line +
 * markers together) is revealed via a clip-path sweep — a reasonable, clearly
 * documented approximation of the spec's SVG stroke-draw-in. */
export function chartMountReveal(durationMs = 500): PartialElement {
  return motion({
    initial: { clipPath: "inset(0 100% 0 0)" },
    animate: { clipPath: "inset(0 0% 0 0)" },
    transition: { duration: durationMs, easing: "ease-out" },
  });
}

// ─── Plot wrapper ─────────────────────────────────────────────────────────────

export interface ChartPlotProps {
  option: ChartOption;
  height?: string;
  overlays?: PartialElement[];
  reveal?: boolean;
}

/** The positioned box that hosts the `chart()` canvas plus any per-point SVG
 * overlays as absolutely-positioned siblings, with the left-to-right mount
 * reveal applied to the whole box. */
export function chartPlot(props: ChartPlotProps): DomphyElement<"div"> {
  const { option, height = "252px", overlays = [], reveal = true } = props;
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
    style: { position: "relative", width: "100%", height },
    $: reveal ? [chartMountReveal()] : [],
  } as DomphyElement<"div">;
}

// ─── SVG per-point overlays ───────────────────────────────────────────────────

export interface StaticPointMarkersProps {
  categories: string[];
  values: number[];
  yDomain: [number, number];
  grid: FixedGrid;
  renderMarker: (params: {
    index: number;
    cx: number;
    cy: number;
    group: SVGGElement;
  }) => void;
}

/** Draws one static SVG marker per data point at the exact pixel position the
 * chart engine itself would use for that point (same public scale factories,
 * same explicit grid/domain). Used for per-point colored dots and custom icon
 * markers — things @domphy/chart's built-in line-symbol renderer cannot do
 * (it draws one uniform circle color per series, ignoring per-item styling). */
export function staticPointMarkersOverlay(
  props: StaticPointMarkersProps,
): PartialElement {
  const { categories, values, yDomain, grid, renderMarker } = props;
  return {
    style: { position: "absolute", inset: "0", pointerEvents: "none" },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const svgNamespace = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(
        svgNamespace,
        "svg",
      ) as SVGSVGElement;
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.style.position = "absolute";
      svg.style.inset = "0";
      svg.style.overflow = "visible";
      container.appendChild(svg);

      function draw(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.textContent = "";
        if (!width || !height) return;
        const xScale = createOrdinalScale(categories, [
          grid.left,
          width - grid.right,
        ]);
        const yScale = createLinearScale(yDomain, [
          height - grid.bottom,
          grid.top,
        ]);
        values.forEach((value, index) => {
          const cx = xScale.map(index);
          const cy = yScale.map(value);
          const group = document.createElementNS(
            svgNamespace,
            "g",
          ) as SVGGElement;
          renderMarker({ index, cx, cy, group });
          svg.appendChild(group);
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

export interface HoverDotOverlayProps {
  categories: string[];
  values: number[];
  yDomain: [number, number];
  grid: FixedGrid;
  color: ThemeColor;
  radius: number;
}

/** A single circle, hidden at rest, that snaps to the nearest column and
 * grows into view while the mouse hovers the plot — the "active dot enlarges
 * on hover" behavior. Listens on the plot wrapper (this overlay's parent
 * element, per `chartPlot`'s DOM structure) since the overlay itself has
 * `pointer-events: none` so the underlying chart tooltip keeps receiving
 * hover events. */
export function hoverDotOverlay(props: HoverDotOverlayProps): PartialElement {
  const { categories, values, yDomain, grid, color, radius } = props;
  return {
    style: { position: "absolute", inset: "0", pointerEvents: "none" },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const wrapper = container.parentElement;
      if (!wrapper) return;

      const svgNamespace = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(
        svgNamespace,
        "svg",
      ) as SVGSVGElement;
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.style.position = "absolute";
      svg.style.inset = "0";
      svg.style.overflow = "visible";
      container.appendChild(svg);

      const dot = document.createElementNS(
        svgNamespace,
        "circle",
      ) as SVGCircleElement;
      dot.setAttribute("r", String(radius));
      dot.setAttribute("fill", themeColorToken(null, "shift-9", color));
      // recharts activeDot defaults: fill=seriesColor, stroke=#fff, strokeWidth=2.
      // The white stroke reads as a card/background-tone ring that separates the
      // active dot from the line — use the lightest neutral (card background).
      dot.setAttribute("stroke", themeColorToken(null, "shift-0", "neutral"));
      dot.setAttribute("stroke-width", "2");
      dot.style.opacity = "0";
      dot.style.transition = "opacity 100ms ease-out";
      svg.appendChild(dot);

      let width = 0;
      let height = 0;
      function updateSize(): void {
        width = container.clientWidth;
        height = container.clientHeight;
      }
      updateSize();
      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(container);

      function onMove(event: MouseEvent): void {
        if (!width || !height || !wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const xScale = createOrdinalScale(categories, [
          grid.left,
          width - grid.right,
        ]);
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        for (let index = 0; index < categories.length; index++) {
          const distance = Math.abs(xScale.map(index) - mouseX);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        }
        const yScale = createLinearScale(yDomain, [
          height - grid.bottom,
          grid.top,
        ]);
        dot.setAttribute("cx", String(xScale.map(nearestIndex)));
        dot.setAttribute("cy", String(yScale.map(values[nearestIndex])));
        dot.style.opacity = "1";
      }
      function onLeave(): void {
        dot.style.opacity = "0";
      }

      wrapper.addEventListener("mousemove", onMove);
      wrapper.addEventListener("mouseleave", onLeave);

      node.addHook("Remove", () => {
        resizeObserver.disconnect();
        wrapper.removeEventListener("mousemove", onMove);
        wrapper.removeEventListener("mouseleave", onLeave);
        svg.remove();
      });
    },
  };
}
