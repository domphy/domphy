// shadcn/ui "charts/tooltip" block family — clean-room reimplementation.
//
// Shared sample data, stacked-bar chart option builder, card scaffold and a
// row-based HTML tooltip formatter reused by every `chartTooltip*` recipe in
// this folder. Every recipe renders the SAME two-series stacked bar chart
// (running vs swimming activity, six days) and only varies the tooltip's
// configuration — mirroring the block family's own research note that all
// nine tooltip recipes share one dataset/chart type so the recipes differ
// purely in tooltip behavior, not chart type or data.
//
// @domphy/chart engine notes learned while building this family (verified
// against packages/chart/src/overlay/tooltip.ts and engine.ts, not guessed):
//   - `TooltipOption.formatter` is the ONLY per-recipe customization hook the
//     engine actually reads at runtime; `backgroundColor`/`borderColor`/
//     `padding`/`extraCssText`/`textStyle`/`renderMode`/`position` are typed
//     on `TooltipOption` but `createTooltip()` never reads them — the panel's
//     border/radius/shadow/background/padding are hardcoded by the engine's
//     own `.dc-tooltip` element. That baseline chrome (rounded, 1px border,
//     page-matching background, soft shadow) already matches this family's
//     visual spec, so every recipe below only builds the formatter's INNER
//     content HTML string, same idiom as chart-line-shared.ts/chart-area-
//     shared.ts's tooltip formatters (a raw HTML string built by the caller,
//     escaped before interpolation, outside @domphy/doctor's scope since it
//     is not a Domphy element `style` object).
//   - `TooltipOption.formatter`'s return type is declared as
//     `string | DomphyElement`, but the engine always does
//     `el.innerHTML = String(formatter(...))` — a returned DomphyElement
//     would just stringify to "[object Object]", so only the string branch
//     is actually usable.
//   - The engine's own `alwaysShowContent`/`showContent` TooltipOption fields
//     are declared but unused, so there is no built-in way to "pin" a
//     tooltip open. `pinTooltipOpenPatch` below approximates the spec's
//     "pinned open on the second column by default" demo behavior by
//     dispatching real `mousemove` events at the exact pixel position the
//     engine's own hit-test would resolve to (same `createOrdinalScale`
//     public factory + the same explicit grid margins passed to the chart
//     option, matching the positioning technique chart-line-shared.ts's own
//     overlays use) — a simulated hover, not a fabricated tooltip DOM.
//
// Implemented purely from the block family's public functional/visual spec —
// no upstream shadcn/ui source was viewed or copied. Sample numbers below are
// original placeholder data, not sourced from upstream.

import type { DomphyElement, PartialElement } from "@domphy/core";
import { themeSpacing, type ThemeColor } from "@domphy/theme";
import { card, heading, paragraph } from "@domphy/ui";
import { chart, createOrdinalScale } from "@domphy/chart";
import type { ChartOption, TooltipParams } from "@domphy/chart";

// ─── Sample dataset ───────────────────────────────────────────────────────────

export interface ActivityDayPoint {
  date: string; // ISO yyyy-mm-dd
  running: number;
  swimming: number;
}

/** Six made-up days of activity energy burn (kcal), original placeholder
 * numbers spanning July 15-20, 2024 per the block family's research note. */
export const ACTIVITY_TOOLTIP_DATA: ActivityDayPoint[] = [
  { date: "2024-07-15", running: 420, swimming: 260 },
  { date: "2024-07-16", running: 380, swimming: 310 },
  { date: "2024-07-17", running: 260, swimming: 400 },
  { date: "2024-07-18", running: 450, swimming: 220 },
  { date: "2024-07-19", running: 340, swimming: 370 },
  { date: "2024-07-20", running: 400, swimming: 300 },
];

export const ACTIVITY_ENERGY_UNIT = "kcal";

const FOOTPRINT_ICON_MARKUP =
  '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><ellipse cx="8" cy="9.5" rx="3" ry="4.8"></ellipse><circle cx="5.8" cy="3.4" r="1"></circle><circle cx="8" cy="2.4" r="1"></circle><circle cx="10.2" cy="3.4" r="1"></circle></svg>';

const WAVE_ICON_MARKUP =
  '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M1 6c1.4-2 2.9-2 4.3 0s2.9 2 4.3 0 2.9-2 4.3 0"></path><path d="M1 10.4c1.4-2 2.9-2 4.3 0s2.9 2 4.3 0 2.9-2 4.3 0"></path></svg>';

export interface ActivitySeriesEntry {
  key: "running" | "swimming";
  name: string;
  color: ThemeColor;
  iconMarkup: string;
}

/** Series order matches @domphy/chart's own default rotation-by-index
 * palette ("primary", "secondary", ...) so the rendered bar fill and the
 * engine-controlled tooltip swatch color stay visually consistent (same
 * precedent documented in chart-area-shared.ts). */
export const ACTIVITY_SERIES_CONFIG: ActivitySeriesEntry[] = [
  { key: "running", name: "Running", color: "primary", iconMarkup: FOOTPRINT_ICON_MARKUP },
  { key: "swimming", name: "Swimming", color: "secondary", iconMarkup: WAVE_ICON_MARKUP },
];

// ─── Date formatters ──────────────────────────────────────────────────────────

export function formatWeekdayShort(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function formatMediumDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatLongDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export interface FixedGrid {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Default plot margins (px) — enough bottom room for the weekday x-axis
 * ticks, no left/right room needed since the y-axis is hidden. */
export const ACTIVITY_CHART_GRID: FixedGrid = { left: 12, right: 12, top: 16, bottom: 28 };

// ─── Chart option builder ─────────────────────────────────────────────────────

export interface ActivityBarOptionProps {
  data: ActivityDayPoint[];
  categories: string[];
  series: ActivitySeriesEntry[];
  showCursor: boolean;
  formatter: (params: TooltipParams | TooltipParams[]) => string;
  grid?: FixedGrid;
}

/** Builds the two-series stacked bar `ChartOption` every recipe in this
 * family shares — only the tooltip's `formatter`/`axisPointer` differ per
 * recipe, per the family's own spec. */
export function activityBarOption(props: ActivityBarOptionProps): ChartOption {
  const { data, categories, series, showCursor, formatter, grid = ACTIVITY_CHART_GRID } = props;
  return {
    tooltip: {
      trigger: "axis",
      // "no custom hover-highlight rectangle" (spec) — a "shadow" axisPointer
      // draws that backdrop rectangle; "none" suppresses it entirely so the
      // tooltip panel is the only hover feedback, matching the default spec.
      axisPointer: { type: showCursor ? "shadow" : "none" },
      formatter,
    },
    grid: { left: grid.left, right: grid.right, top: grid.top, bottom: grid.bottom, containLabel: false },
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: true },
      splitLine: { show: false },
    },
    yAxis: { type: "value", show: false },
    series: series.map((entry) => ({
      type: "bar",
      name: entry.name,
      stack: "activity",
      barMaxWidth: 28,
      color: entry.color,
      data: data.map((point) => point[entry.key]),
    })),
  };
}

// ─── Tooltip content formatter ─────────────────────────────────────────────────

export type TooltipIndicatorStyle = "dot" | "square" | "line" | "icon" | "none";
export type TooltipLabelMode = "date" | "long-date" | "static" | "custom";

export interface TooltipValueContext {
  value: number;
  seriesKey: ActivitySeriesEntry["key"] | "total";
  entry: ActivitySeriesEntry | undefined;
  rowIndex: number;
}

export interface ActivityTooltipOptions {
  indicator?: TooltipIndicatorStyle;
  showLabel?: boolean;
  labelMode?: TooltipLabelMode;
  staticLabel?: string;
  labelFormatter?: (isoDate: string) => string;
  renderValue?: (context: TooltipValueContext) => string;
  minRowWidthPx?: number;
  panelMinWidthPx?: number;
  showTotal?: boolean;
  totalLabel?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstParams(input: TooltipParams | TooltipParams[]): TooltipParams[] {
  return Array.isArray(input) ? input : [input];
}

function resolveSeriesEntry(
  seriesConfig: ActivitySeriesEntry[],
  seriesName: string,
): ActivitySeriesEntry | undefined {
  return seriesConfig.find((entry) => entry.name === seriesName);
}

function renderIndicator(
  style: TooltipIndicatorStyle,
  colorHex: string,
  entry: ActivitySeriesEntry | undefined,
): string {
  switch (style) {
    case "dot":
      return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colorHex};margin-right:6px;vertical-align:middle;"></span>`;
    case "square":
      return `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${colorHex};margin-right:6px;vertical-align:middle;"></span>`;
    case "line":
      return `<span style="display:inline-block;width:3px;height:12px;border-radius:2px;background:${colorHex};margin-right:6px;vertical-align:middle;"></span>`;
    case "icon":
      return entry
        ? `<span style="display:inline-flex;width:12px;height:12px;margin-right:6px;vertical-align:middle;color:${colorHex};">${entry.iconMarkup}</span>`
        : "";
    default:
      return "";
  }
}

/** Plain escaped number — the default value renderer used when a recipe
 * doesn't supply its own `renderValue`. */
export function plainValueRenderer(context: TooltipValueContext): string {
  return escapeHtml(String(context.value));
}

/** Monospace/tabular number immediately followed by a small muted unit
 * abbreviation — shared by the "formatter" and "advanced" recipes, which the
 * family's own research note calls out as two independently composable
 * tooltip capabilities layered on the SAME value-cell renderer. */
export function monoUnitValueRenderer(unit: string): (context: TooltipValueContext) => string {
  return (context) =>
    `<span style="font-variant-numeric:tabular-nums;font-family:ui-monospace,monospace;">${escapeHtml(String(context.value))}</span>` +
    // Not `opacity:0.6` — that measured a real WCAG contrast failure (axe-
    // core `color-contrast`) against the tooltip's own background. The unit
    // still reads as de-emphasized next to the bold/monospace value without
    // needing reduced opacity.
    `<span style="margin-left:2px;">${escapeHtml(unit)}</span>`;
}

function renderTooltipRow(params: {
  indicator: TooltipIndicatorStyle;
  colorHex: string;
  entry: ActivitySeriesEntry | undefined;
  label: string;
  valueHtml: string;
  bold?: boolean;
}): string {
  const { indicator, colorHex, entry, label, valueHtml, bold = false } = params;
  const weight = bold ? "font-weight:600;" : "";
  return (
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;${weight}">` +
    `<span style="display:flex;align-items:center;">${renderIndicator(indicator, colorHex, entry)}${escapeHtml(label)}</span>` +
    `<span>${valueHtml}</span>` +
    `</div>`
  );
}

function renderHeaderLabel(
  options: ActivityTooltipOptions,
  dataIndex: number,
  dataset: ActivityDayPoint[],
): string {
  if (options.labelMode === "static") return escapeHtml(options.staticLabel ?? "");
  const isoDate = dataset[dataIndex]?.date ?? "";
  if (options.labelMode === "custom" && options.labelFormatter) {
    return escapeHtml(options.labelFormatter(isoDate));
  }
  if (options.labelMode === "long-date") return escapeHtml(formatLongDate(isoDate));
  return escapeHtml(formatMediumDate(isoDate));
}

/**
 * Builds an axis-trigger tooltip `formatter` that renders an optional bold
 * header row (date, long-form date, a static config label, or a custom
 * callback) followed by one indicator+name+value row per series, and an
 * optional divider + bold "Total" row beneath the last series row on every
 * column when `showTotal` is set (mirroring the upstream recipe, whose custom
 * formatter appends the total after its last series item on every hover).
 */
export function activityTooltipFormatter(
  dataset: ActivityDayPoint[],
  seriesConfig: ActivitySeriesEntry[],
  options: ActivityTooltipOptions = {},
): (params: TooltipParams | TooltipParams[]) => string {
  const {
    indicator = "dot",
    showLabel = true,
    renderValue = plainValueRenderer,
    minRowWidthPx,
    panelMinWidthPx,
    showTotal = false,
    totalLabel = "Total",
  } = options;

  function wrapValue(valueHtml: string): string {
    return minRowWidthPx
      ? `<span style="display:inline-block;min-width:${minRowWidthPx}px;text-align:right;">${valueHtml}</span>`
      : valueHtml;
  }

  return (input) => {
    const params = firstParams(input);
    if (params.length === 0) return "";
    const dataIndex = params[0].dataIndex;

    const rows = params
      .map((point, rowIndex) => {
        const entry = resolveSeriesEntry(seriesConfig, point.seriesName);
        const value = Number(point.value ?? 0);
        const valueHtml = wrapValue(
          renderValue({ value, seriesKey: entry?.key ?? "running", entry, rowIndex }),
        );
        return renderTooltipRow({
          indicator,
          colorHex: point.color,
          entry,
          label: entry?.name ?? String(point.seriesName ?? ""),
          valueHtml,
        });
      })
      .join("");

    let totalHtml = "";
    if (showTotal) {
      const sum = params.reduce((total, point) => total + Number(point.value ?? 0), 0);
      const totalValueHtml = wrapValue(
        renderValue({ value: sum, seriesKey: "total", entry: undefined, rowIndex: params.length }),
      );
      totalHtml =
        '<div style="margin:6px 0;border-top:1px solid currentColor;opacity:0.15;"></div>' +
        renderTooltipRow({
          indicator: "none",
          colorHex: "",
          entry: undefined,
          label: totalLabel,
          valueHtml: totalValueHtml,
          bold: true,
        });
    }

    const header = showLabel
      ? `<div style="font-weight:600;margin-bottom:4px;">${renderHeaderLabel(options, dataIndex, dataset)}</div>`
      : "";

    const body = `<div>${header}${rows}${totalHtml}</div>`;
    return panelMinWidthPx ? `<div style="min-width:${panelMinWidthPx}px;">${body}</div>` : body;
  };
}

// ─── Card scaffold ────────────────────────────────────────────────────────────

export const ACTIVITY_CARD_WIDTH = themeSpacing(104);

export interface ActivityTooltipCardProps {
  title: string;
  description: string;
  plot: DomphyElement;
  width?: string;
}

export function activityTooltipCard(props: ActivityTooltipCardProps): DomphyElement<"div"> {
  const { title, description, plot, width = ACTIVITY_CARD_WIDTH } = props;
  return {
    div: [
      { h3: title, $: [heading()] } as DomphyElement<"h3">,
      { p: description, $: [paragraph({ color: "neutral" })] } as DomphyElement<"p">,
      { div: [plot] } as DomphyElement<"div">,
    ],
    $: [card({ color: "neutral" })],
    style: { width: "100%", maxWidth: width },
  } as DomphyElement<"div">;
}

// ─── Plot wrapper + demo "pinned open" tooltip ─────────────────────────────────

export interface PinTooltipOpenProps {
  index: number;
  categories: string[];
  grid: FixedGrid;
  maxAttempts?: number;
}

/**
 * Demo-only helper: dispatches synthetic `mousemove` events at the pixel
 * position of the given category column, computed with the SAME public
 * `createOrdinalScale` factory and the SAME explicit grid margins passed to
 * the `chart()` option that the engine itself uses internally (see
 * packages/chart/src/coord/grid.ts `resolveGrid`) — so the dispatched point
 * lands on the exact column the engine's own hit-test would resolve to. This
 * lets a demo "pin" its tooltip open on mount without reaching into engine
 * internals; it is a real simulated hover, not a fabricated tooltip DOM.
 *
 * @domphy/chart's WebGL init (`ChartEngine.init()`) is async, so the first
 * animation frames after mount may report a zero-size container or an engine
 * that hasn't attached its mousemove listener yet — this retries on
 * `requestAnimationFrame` for a bounded number of frames, then stops.
 */
export function pinTooltipOpenPatch(props: PinTooltipOpenProps): PartialElement {
  const { index, categories, grid, maxAttempts = 45 } = props;
  return {
    _onMount(node) {
      if (typeof requestAnimationFrame !== "function") return;
      if (index < 0 || index >= categories.length) return;
      const container = node.domElement as HTMLElement;
      let attempts = 0;
      let cancelled = false;

      function dispatch(): void {
        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const xScale = createOrdinalScale(categories, [grid.left, rect.width - grid.right]);
        const targetX = xScale.map(index);
        const targetY = grid.top + (rect.height - grid.top - grid.bottom) / 2;
        container.dispatchEvent(
          new MouseEvent("mousemove", {
            bubbles: true,
            clientX: rect.left + targetX,
            clientY: rect.top + targetY,
          }),
        );
      }

      function tick(): void {
        if (cancelled) return;
        attempts += 1;
        dispatch();
        if (attempts < maxAttempts) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      node.addHook("Remove", () => {
        cancelled = true;
      });
    },
  };
}

export interface ActivityTooltipPlotProps {
  option: ChartOption;
  categories: string[];
  grid?: FixedGrid;
  defaultOpenIndex?: number | null;
  height?: string;
}

/** The positioned box that hosts the `chart()` canvas, optionally pinning
 * its tooltip open on a given column on mount for documentation previews. */
export function activityTooltipPlot(props: ActivityTooltipPlotProps): DomphyElement<"div"> {
  const { option, categories, grid = ACTIVITY_CHART_GRID, defaultOpenIndex = null, height = "240px" } = props;
  const patches: PartialElement[] = [chart(option)];
  if (defaultOpenIndex !== null && defaultOpenIndex !== undefined) {
    patches.push(pinTooltipOpenPatch({ index: defaultOpenIndex, categories, grid }));
  }
  return {
    div: null,
    style: { position: "relative", width: "100%", height },
    $: patches,
  } as DomphyElement<"div">;
}
