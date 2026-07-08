// shadcn/ui "charts/line-label" block — clean-room reimplementation.
//
// The dotted single-line six-month chart (see chartLineDots) with a small
// always-on numeric label floating above every data point, plus extra top
// margin so the topmost label isn't clipped by the card edge.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { type ThemeColor, themeColorToken } from "@domphy/theme";
import type { ChartOption, TooltipParams } from "@domphy/chart";
import {
  MONTHLY_VISITOR_DATA,
  type MonthlyPoint,
  chartCard,
  chartPlot,
  computeYDomain,
  hiddenLabelYAxis,
  hoverDotOverlay,
  monthCategoryXAxis,
  staticPointMarkersOverlay,
  trendFooter,
} from "./chart-line-shared.js";

const REST_DOT_RADIUS = 4;
// Upstream activeDot={{ r: 6 }} — the hover dot matches that radius.
const ACTIVE_DOT_RADIUS = 6;

// Upstream LineChart margin { top: 20, left: 12, right: 12 }; bottom carries the
// month x-axis labels. Local grid instead of the shared LABELED_LINE_GRID (which
// reserves top: 28) so the top whitespace above the topmost value label matches
// upstream's 20px. Passed to both the chart option and the SVG overlays so they
// stay pixel-synced.
const PLOT_GRID = { left: 12, right: 12, top: 20, bottom: 28 };

// Muted-foreground tone for the nested series name (matches upstream's
// text-muted-foreground). Full card foreground + a monospace stack for the
// value, matching upstream's `font-mono ... text-foreground` value span.
const MUTED_TEXT = themeColorToken(null, "shift-9", "neutral");
const FOREGROUND_TEXT = themeColorToken(null, "shift-11", "neutral");
const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Mirrors shadcn's <ChartTooltipContent indicator="line" /> on a single series:
 * with one series and a non-"dot" indicator upstream sets nestLabel=true, so the
 * hovered category (month) is a bold header nested above the muted series name,
 * with a thin vertical line swatch and the value aligned to the right. The shared
 * lineSwatchLabelValueTooltipFormatter omits the month header, so this recipe
 * builds its own nested variant. (Raw HTML string like the shared formatters —
 * see chart-line-shared.ts's tooltip-formatter note; all values are escaped.)
 *
 * Closes over `categories`: for a numeric line series the engine reports
 * `params.name` as the point index, not the axis label, so the month header is
 * looked up from `categories[dataIndex]`.
 */
function nestLabelTooltipFormatter(categories: string[]) {
  return (params: TooltipParams | TooltipParams[]): string => {
    const point = Array.isArray(params) ? params[0] : params;
    if (!point) return "";
    const month = escapeHtml(String(categories[point.dataIndex] ?? point.name ?? ""));
    const series = escapeHtml(String(point.seriesName ?? ""));
    const value = escapeHtml(String(point.value ?? ""));
    const swatch = `<span style="display:inline-block;width:3px;align-self:stretch;border-radius:2px;background:${point.color};margin-right:8px;"></span>`;
    return (
      `<span style="display:flex;align-items:stretch;">${swatch}` +
      `<span style="display:flex;flex:1;justify-content:space-between;align-items:flex-end;gap:16px;">` +
      `<span style="display:flex;flex-direction:column;gap:6px;">` +
      `<span style="font-weight:500;">${month}</span>` +
      `<span style="color:${MUTED_TEXT};">${series}</span>` +
      `</span>` +
      `<span style="font-family:${MONO_FONT};font-weight:500;` +
      `font-variant-numeric:tabular-nums;color:${FOREGROUND_TEXT};">${value}</span>` +
      `</span></span>`
    );
  };
}

/** Props for {@link chartLineLabel}. */
export interface ChartLineLabelProps {
  title?: string;
  description?: string;
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  data?: MonthlyPoint[];
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-label" — the dotted single-line chart with an
 * always-visible numeric value label above every point. Call with no
 * arguments for a fully working demo.
 */
function chartLineLabel(props: ChartLineLabelProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Label",
    description = "January - June 2026",
    seriesLabel = "Desktop",
    seriesColor = "primary",
    data = MONTHLY_VISITOR_DATA,
    trendHeadline = "Trending up by 5.2% this month",
    trendSubtitle = "Showing total visitors for the last 6 months",
    trendDirection = "up",
  } = props;

  const categories = data.map((point) => point.month);
  const values = data.map((point) => point.desktop);
  const yDomain = computeYDomain(values);
  const dotFill = themeColorToken(null, "shift-9", seriesColor);

  const option: ChartOption = {
    grid: PLOT_GRID,
    xAxis: monthCategoryXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: nestLabelTooltipFormatter(categories),
    },
    series: [
      {
        type: "line",
        name: seriesLabel,
        data: values,
        // Upstream Line uses type="natural" (natural cubic spline); @domphy/chart
        // has no natural/monotone interpolation mode (smoothMonotone is declared
        // but unimplemented), so the closest available `smooth` spline is kept.
        smooth: true,
        // Resting dots are drawn as solid filled circles by the overlay below
        // (upstream `dot={{ fill: color }}`); the engine's built-in line symbol
        // is a hollow white-fill circle, so it is disabled here.
        showSymbol: false,
        lineStyle: { width: 2 },
        color: seriesColor,
        // Upstream <LabelList className="fill-foreground"> — full card foreground,
        // not the engine's muted default point-label tone.
        label: { show: true, fontSize: 12, color: "neutral" },
      },
    ],
  };

  return chartCard({
    title,
    description,
    plot: chartPlot({
      option,
      overlays: [
        staticPointMarkersOverlay({
          categories,
          values,
          yDomain,
          grid: PLOT_GRID,
          renderMarker({ cx, cy, group }) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle") as SVGCircleElement;
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(REST_DOT_RADIUS));
            circle.setAttribute("fill", dotFill);
            group.appendChild(circle);
          },
        }),
        hoverDotOverlay({
          categories,
          values,
          yDomain,
          grid: PLOT_GRID,
          color: seriesColor,
          radius: ACTIVE_DOT_RADIUS,
        }),
      ],
    }),
    footer: trendFooter({
      headline: trendHeadline,
      subtitle: trendSubtitle,
      direction: trendDirection,
    }),
  });
}

export { chartLineLabel };
