// shadcn/ui "charts/line" (default) block — clean-room reimplementation.
//
// A single-series smoothed line chart inside a titled card: six months of
// visitor data, horizontal-only gridlines, no y-axis, a bottom month axis
// with no axis line/ticks, and a bold trend sentence + up/down arrow in the
// footer. Hovering the plot shows a bare numeric value tooltip with no
// cursor highlight band.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  chartCard,
  chartPlot,
  computeYDomain,
  DEFAULT_LINE_GRID,
  hiddenLabelYAxis,
  MONTHLY_VISITOR_DATA,
  type MonthlyPoint,
  monthCategoryXAxis,
  tooltipRow,
  trendFooter,
} from "./chart-line-shared.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Matches upstream `<ChartTooltipContent hideLabel />` default (indicator
 * "dot"): a ~10px rounded-square swatch in the series color, the series label,
 * and the value formatted with thousands separators via `toLocaleString()`.
 * Defined locally rather than via the shared line-swatch formatter because
 * that one draws a line-style bar and stringifies the value raw. */
function chartLineDefaultTooltipFormatter(
  params: TooltipParams | TooltipParams[],
): string {
  const point = Array.isArray(params) ? params[0] : params;
  if (!point) return "";
  const swatch = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${point.color};"></span>`;
  const label = escapeHtml(String(point.seriesName ?? point.name ?? ""));
  const value = point.value;
  const valueText =
    typeof value === "number" ? value.toLocaleString() : String(value ?? "");
  return tooltipRow(swatch, label, escapeHtml(valueText));
}

/** Props for {@link chartLineDefault}. */
export interface ChartLineDefaultProps {
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
 * shadcn/ui "charts/line" (default) — a titled card holding a smoothed
 * single-series line chart with a trend callout footer. Call with no
 * arguments for a fully working demo.
 */
function chartLineDefault(
  props: ChartLineDefaultProps = {},
): DomphyElement<"div"> {
  const {
    title = "Line Chart",
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

  const option: ChartOption = {
    grid: DEFAULT_LINE_GRID,
    xAxis: monthCategoryXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: chartLineDefaultTooltipFormatter,
    },
    series: [
      {
        type: "line",
        name: seriesLabel,
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        color: seriesColor,
      },
    ],
  };

  return chartCard({
    title,
    description,
    plot: chartPlot({ option }),
    footer: trendFooter({
      headline: trendHeadline,
      subtitle: trendSubtitle,
      direction: trendDirection,
    }),
  });
}

export { chartLineDefault };
