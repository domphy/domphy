// shadcn/ui "charts/line-multiple" block — clean-room reimplementation.
//
// Two smoothed lines (two series) plotted on the same six-month chart, each
// in its own accent color, with no point markers. Hovering shows a bold
// month header above a color swatch + series label + value row per line,
// with the cursor highlight band suppressed.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  chartCard,
  chartLineSeriesColor,
  chartPlot,
  computeYDomain,
  DEFAULT_LINE_GRID,
  hiddenLabelYAxis,
  lineSwatchLabelValueTooltipFormatter,
  MONTHLY_VISITOR_DATA,
  type MonthlyPoint,
  monthCategoryXAxis,
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

/** Prefixes the hovered category's bold header line with one swatch+label+value
 * row PER series — this recipe's upstream `<ChartTooltipContent/>` is an
 * axis-trigger tooltip with `hideLabel` unset (unlike chart-line-default's
 * `hideLabel`), so the month name shows above a row for every line (Desktop
 * AND Mobile), not just the first. The engine passes the full per-series
 * params[] for an axis trigger; each row reuses the shared single-row markup. */
function chartLineMultipleTooltipFormatter(
  params: TooltipParams | TooltipParams[],
): string {
  const list = Array.isArray(params) ? params : [params];
  if (list.length === 0) return "";
  const name = list[0]?.name;
  const header = name
    ? `<div style="font-weight:600;margin-bottom:4px;">${escapeHtml(String(name))}</div>`
    : "";
  const rows = list
    .map((point, rowIndex) =>
      lineSwatchLabelValueTooltipFormatter(
        point,
        chartLineSeriesColor(point.seriesIndex ?? rowIndex).css,
      ),
    )
    .join("<br>");
  return `${header}${rows}`;
}

/** Props for {@link chartLineMultiple}. */
export interface ChartLineMultipleProps {
  title?: string;
  description?: string;
  primarySeriesLabel?: string;
  primarySeriesColor?: ThemeColor;
  secondarySeriesLabel?: string;
  secondarySeriesColor?: ThemeColor;
  data?: MonthlyPoint[];
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-multiple" — two smoothed lines sharing one
 * six-month category axis, with a richer per-series hover tooltip. Call with
 * no arguments for a fully working demo.
 */
function chartLineMultiple(
  props: ChartLineMultipleProps = {},
): DomphyElement<"div"> {
  const {
    title = "Line Chart - Multiple",
    description = "January - June 2026",
    primarySeriesLabel = "Desktop",
    primarySeriesColor = "primary",
    secondarySeriesLabel = "Mobile",
    // Both series are steps of the same monochrome blue ramp (upstream
    // desktop=var(--chart-1), mobile=var(--chart-2)) — the engine pins line
    // strokes to the family at shift-9, so the steps are approximated via
    // stroke opacity below.
    secondarySeriesColor = "primary",
    data = MONTHLY_VISITOR_DATA,
    trendHeadline = "Trending up by 5.2% this month",
    trendSubtitle = "Showing total visitors for the last 6 months",
    trendDirection = "up",
  } = props;

  const categories = data.map((point) => point.month);
  const desktopValues = data.map((point) => point.desktop);
  const mobileValues = data.map((point) => point.mobile);
  const yDomain = computeYDomain([...desktopValues, ...mobileValues]);

  const option: ChartOption = {
    grid: DEFAULT_LINE_GRID,
    xAxis: monthCategoryXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: chartLineMultipleTooltipFormatter,
    },
    series: [
      {
        type: "line",
        name: primarySeriesLabel,
        data: desktopValues,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2,
          opacity: chartLineSeriesColor(0).strokeOpacity,
        },
        color: primarySeriesColor,
      },
      {
        type: "line",
        name: secondarySeriesLabel,
        data: mobileValues,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2,
          opacity: chartLineSeriesColor(1).strokeOpacity,
        },
        color: secondarySeriesColor,
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

export { chartLineMultiple };
