// shadcn/ui "chart-area" (icons recipe) — clean-room reimplementation.
//
// The same two-series area chart as the legend recipe, but each series is
// represented by a small trend-arrow pictogram instead of a flat color
// swatch in the legend row, and the footer trend line pairs its sentence
// with a matching icon (same chartTrendFooter used by every other recipe
// already does this — the icons recipe's real distinguishing feature is the
// legend row).
//
// Per the spec's research note, icon choice is treated as fully
// caller-configurable rather than semantically meaningful by default.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_AREA_SERIES_PALETTE,
  CHART_AREA_TWO_SERIES_DATA,
  CHART_AREA_X_AXIS_BARE,
  CHART_AREA_Y_AXIS_HIDDEN,
  chartAreaFrame,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartLegendRow,
  chartTrendFooter,
  type ChartAreaTwoSeriesPoint,
  type ChartTrendDirection,
} from "./chart-area-shared.js";

export interface ChartAreaIconsSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
  icon: ChartTrendDirection;
}

export interface ChartAreaIconsProps {
  data?: ChartAreaTwoSeriesPoint[];
  series?: ChartAreaIconsSeries[];
  stackId?: string;
  fillOpacity?: number;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartAreaIconsSeries[] = [
  { key: "desktop", label: "Desktop", color: CHART_AREA_SERIES_PALETTE[0], icon: "down" },
  { key: "mobile", label: "Mobile", color: CHART_AREA_SERIES_PALETTE[1], icon: "up" },
];

/**
 * shadcn/ui "chart-area" icons recipe — a stacked two-series area chart
 * whose legend entries use trend-arrow pictograms instead of plain color
 * swatches. Call with no arguments for a working demo.
 */
function chartAreaIcons(props: ChartAreaIconsProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_AREA_TWO_SERIES_DATA,
    series = DEFAULT_SERIES,
    stackId = "total",
    fillOpacity = 0.4,
    title = "Area Chart - Icons",
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
    content: {
      div: [
        chartAreaFrame(option, height),
        chartLegendRow(series.map((s) => ({ label: s.label, color: s.color, icon: s.icon }))),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartAreaIcons };
