// shadcn/ui "chart-area" (stacked recipe) — clean-room reimplementation.
//
// A two-series area chart where the second series' fill sits stacked on top
// of the first, producing a cumulative layered mountain silhouette instead
// of overlapping shapes.
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
  chartTrendFooter,
} from "./chart-area-shared.js";

export interface ChartAreaStackedSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
}

export interface ChartAreaStackedProps {
  data?: ChartAreaTwoSeriesPoint[];
  series?: ChartAreaStackedSeries[];
  stackId?: string;
  fillOpacity?: number;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartAreaStackedSeries[] = [
  { key: "mobile", label: "Mobile", color: CHART_AREA_SERIES_PALETTE[0] },
  { key: "desktop", label: "Desktop", color: CHART_AREA_SERIES_PALETTE[1] },
];

/**
 * shadcn/ui "chart-area" stacked recipe — two area series stacked into a
 * layered mountain silhouette, sharing a stack group so the visible top
 * edge is the cumulative total. Call with no arguments for a working demo.
 */
function chartAreaStacked(
  props: ChartAreaStackedProps = {},
): DomphyElement<"div"> {
  const {
    data = CHART_AREA_TWO_SERIES_DATA,
    series = DEFAULT_SERIES,
    stackId = "total",
    fillOpacity = 0.4,
    title = "Area Chart - Stacked",
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
      formatter: chartAxisTooltipFormatter(categories),
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
    content: { div: [chartAreaFrame(option, height)] },
    footer: chartTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
    }),
  });
}

export { chartAreaStacked };
