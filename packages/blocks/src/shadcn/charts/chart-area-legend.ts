// shadcn/ui "chart-area" (legend recipe) — clean-room reimplementation.
//
// A two-series stacked area chart (same flat-fill treatment as the stacked
// recipe) with an explicit swatch + label legend row centered below the
// plot.
//
// The engine's own built-in SVG legend overlay (LegendOption) only supports
// a fixed vocabulary of geometric symbol shapes for its swatch icon and is
// positioned inside the chart's own SVG layer, not the card's DOM flow — so
// this recipe hand-builds the legend row as a sibling of the chart frame
// (chartLegendRow) instead of enabling `option.legend`, for full control over
// placement/typography and to reuse @domphy/ui's small()/icon() patches.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_AREA_SERIES_PALETTE,
  CHART_AREA_TWO_SERIES_DATA,
  CHART_AREA_X_AXIS_BARE,
  CHART_AREA_Y_AXIS_HIDDEN,
  type ChartAreaTwoSeriesPoint,
  type ChartTrendDirection,
  chartAreaFrame,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartLegendRow,
  chartTrendFooter,
} from "./chart-area-shared.js";

export interface ChartAreaLegendSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
}

export interface ChartAreaLegendProps {
  data?: ChartAreaTwoSeriesPoint[];
  series?: ChartAreaLegendSeries[];
  stackId?: string;
  fillOpacity?: number;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartAreaLegendSeries[] = [
  { key: "mobile", label: "Mobile", color: CHART_AREA_SERIES_PALETTE[1] },
  { key: "desktop", label: "Desktop", color: CHART_AREA_SERIES_PALETTE[0] },
];

/**
 * shadcn/ui "chart-area" legend recipe — a stacked two-series area chart
 * with a swatch + label legend row below the plot. Call with no arguments
 * for a working demo.
 */
function chartAreaLegend(
  props: ChartAreaLegendProps = {},
): DomphyElement<"div"> {
  const {
    data = CHART_AREA_TWO_SERIES_DATA,
    series = DEFAULT_SERIES,
    stackId = "total",
    fillOpacity = 0.4,
    title = "Area Chart - Legend",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = `${data[0]?.month ?? ""} - ${data[data.length - 1]?.month ?? ""} 2026`,
    height = 64,
  } = props;

  const categories = data.map((point) => point.month);

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      // Upstream passes `<ChartTooltipContent indicator="line" />`.
      formatter: chartAxisTooltipFormatter(
        categories,
        undefined,
        false,
        "line",
      ),
    },
    xAxis: { ...CHART_AREA_X_AXIS_BARE, data: categories },
    yAxis: CHART_AREA_Y_AXIS_HIDDEN,
    grid: { left: 8, right: 8, top: 12, bottom: 24, containLabel: false },
    series: series.map((s) => ({
      type: "line",
      name: s.label,
      stack: stackId,
      smooth: true,
      showSymbol: false,
      color: s.color,
      lineStyle: { width: 2 },
      areaStyle: { opacity: fillOpacity },
      data: data.map((point) => point[s.key]),
    })),
  };

  return chartCardShell({
    title,
    description,
    content: {
      div: [
        chartAreaFrame(option, height),
        chartLegendRow(series.map((s) => ({ label: s.label, color: s.color }))),
      ],
    },
    footer: chartTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
    }),
  });
}

export { chartAreaLegend };
