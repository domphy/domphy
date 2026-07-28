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
  chartLegendRow,
  chartTrendFooter,
} from "./chart-area-shared.js";

export interface ChartAreaLegendSeries {
  key: "desktop" | "mobile";
  label: string;
  /** Ramp tone within the primary family (approximates var(--chart-N)). */
  tone: ChartAreaSeriesTone;
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
  { key: "mobile", label: "Mobile", tone: chartAreaSeriesColor(0).tone },
  { key: "desktop", label: "Desktop", tone: chartAreaSeriesColor(1).tone },
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
        color: chartAreaGradientFill("primary", fillOpacity, fillOpacity, s.tone),
        opacity: 1,
      },
      data: data.map((point) => point[s.key]),
    })),
  };

  return chartCardShell({
    title,
    description,
    content: {
      div: [
        chartAreaFrame(option, height),
        chartLegendRow(
          series.map((s) => ({ label: s.label, color: "primary", tone: s.tone })),
        ),
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
