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
import {
  CHART_AREA_TWO_SERIES_DATA,
  CHART_AREA_X_AXIS_BARE,
  CHART_AREA_Y_AXIS_HIDDEN,
  type ChartAreaSeriesTone,
  type ChartAreaTwoSeriesPoint,
  type ChartTrendDirection,
  chartAreaFrame,
  chartAreaGradientFill,
  chartAreaSeriesColor,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartTrendFooter,
} from "./chart-area-shared.js";

export interface ChartAreaStackedSeries {
  key: "desktop" | "mobile";
  label: string;
  /** Ramp tone within the primary family (approximates var(--chart-N)). */
  tone: ChartAreaSeriesTone;
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
  { key: "mobile", label: "Mobile", tone: chartAreaSeriesColor(0).tone },
  { key: "desktop", label: "Desktop", tone: chartAreaSeriesColor(1).tone },
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
    grid: { left: 8, right: 8, top: 12, bottom: 32, containLabel: false },
    series: series.map((s, seriesIndex) => ({
      type: "line",
      name: s.label,
      stack: stackId,
      smooth: true,
      showSymbol: false,
      // The engine pins strokes to the family at shift-9; the ramp step is
      // approximated via stroke opacity, and the fill carries the exact tone.
      color: "primary",
      lineStyle: {
        width: 2,
        opacity: chartAreaSeriesColor(seriesIndex).strokeOpacity,
      },
      areaStyle: {
        color: chartAreaGradientFill(
          "primary",
          fillOpacity,
          fillOpacity,
          s.tone,
        ),
        opacity: 1,
      },
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
