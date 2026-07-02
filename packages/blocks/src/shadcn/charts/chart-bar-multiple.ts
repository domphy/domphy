// shadcn/ui "chart-bar" (multiple recipe) — clean-room reimplementation.
//
// A two-series grouped bar chart: each month shows a tight desktop/mobile
// bar pair, with only vertical gridlines and a shared hover tooltip listing
// both series plus a vertical cursor guide line.
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
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarTwoSeriesPoint,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarMultipleSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
}

export interface ChartBarMultipleProps {
  data?: ChartBarTwoSeriesPoint[];
  series?: ChartBarMultipleSeries[];
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartBarMultipleSeries[] = [
  { key: "desktop", label: "Desktop", color: CHART_BAR_SERIES_PALETTE[0] },
  { key: "mobile", label: "Mobile", color: CHART_BAR_SERIES_PALETTE[1] },
];

/**
 * shadcn/ui "chart-bar" multiple recipe — a two-series grouped bar chart.
 * Call with no arguments for a working demo.
 */
function chartBarMultiple(props: ChartBarMultipleProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_TWO_SERIES_DATA,
    series = DEFAULT_SERIES,
    title = "Bar Chart - Multiple",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    height = 64,
  } = props;

  const categories = data.map((point) => point.label);
  const allValues = series.flatMap((s) => data.map((point) => point[s.key]));
  const [, domainMax] = chartBarValueDomain(allValues);

  const option: ChartOption = {
    // No formatter override — the engine's default axis-trigger tooltip
    // already renders one color-dot + series-name + value row per series,
    // matching the spec's "shared tooltip listing both series' values with
    // small color swatches" without a per-month title line.
    tooltip: { trigger: "axis" },
    xAxis: chartBarCategoryXAxis(categories, { splitLine: true }),
    yAxis: chartBarHiddenValueYAxis({ splitLine: false, min: 0, max: domainMax }),
    grid: { left: 8, right: 8, top: 16, bottom: 24 },
    series: series.map((s) => ({
      type: "bar",
      name: s.label,
      color: s.color,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: data.map((point) => point[s.key]),
    })),
  };

  return chartBarCardShell({
    title,
    subtitle,
    content: { div: [chartBarFrame(option, { height })] },
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartBarMultiple };
