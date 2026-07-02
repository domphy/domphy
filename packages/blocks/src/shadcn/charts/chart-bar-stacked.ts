// shadcn/ui "chart-bar" (stacked recipe) — clean-room reimplementation.
//
// A two-series bar chart stacked into one bar per month (bottom segment =
// first series, top segment = second), with a swatch + label legend row
// below the plot and a tooltip breaking down both segments plus their total.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_SERIES_PALETTE,
  CHART_BAR_TWO_SERIES_DATA,
  chartBarCardShell,
  chartBarCategoryXAxis,
  chartBarFrame,
  chartBarHiddenValueYAxis,
  chartBarLegendRow,
  chartBarStackedTooltipFormatter,
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarTwoSeriesPoint,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarStackedSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
}

export interface ChartBarStackedProps {
  data?: ChartBarTwoSeriesPoint[];
  series?: ChartBarStackedSeries[];
  stackId?: string;
  showLegend?: boolean;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartBarStackedSeries[] = [
  { key: "desktop", label: "Desktop", color: CHART_BAR_SERIES_PALETTE[0] },
  { key: "mobile", label: "Mobile", color: CHART_BAR_SERIES_PALETTE[1] },
];

/**
 * shadcn/ui "chart-bar" stacked recipe — two series stacked into one bar
 * per month, with a legend row below. Call with no arguments for a working
 * demo.
 */
function chartBarStacked(props: ChartBarStackedProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_TWO_SERIES_DATA,
    series = DEFAULT_SERIES,
    stackId = "visitors",
    showLegend = true,
    title = "Bar Chart - Stacked + Legend",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    height = 64,
  } = props;

  const categories = data.map((point) => point.label);
  const totals = data.map((point) => series.reduce((sum, s) => sum + point[s.key], 0));
  const [, domainMax] = chartBarValueDomain(totals);

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: chartBarStackedTooltipFormatter(categories),
    },
    xAxis: chartBarCategoryXAxis(categories),
    yAxis: chartBarHiddenValueYAxis({ splitLine: true, min: 0, max: domainMax }),
    grid: { left: 8, right: 8, top: 16, bottom: 24 },
    series: series.map((s) => ({
      type: "bar",
      name: s.label,
      stack: stackId,
      color: s.color,
      data: data.map((point) => point[s.key]),
    })),
  };

  const content: DomphyElement<"div"> = {
    div: [
      chartBarFrame(option, { height }),
      ...(showLegend ? [chartBarLegendRow(series.map((s) => ({ label: s.label, color: s.color })))] : []),
    ],
  };

  return chartBarCardShell({
    title,
    subtitle,
    content,
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartBarStacked };
