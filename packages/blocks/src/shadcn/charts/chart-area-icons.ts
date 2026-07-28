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

export interface ChartAreaIconsSeries {
  key: "desktop" | "mobile";
  label: string;
  /** Ramp tone within the primary family (approximates var(--chart-N)). */
  tone: ChartAreaSeriesTone;
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

// Mobile-first, matching upstream's Area child order (mobile <Area> declared
// before desktop) so mobile (chart-1) is the bottom stack band and desktop
// (chart-2) sits on top, and the legend row renders Mobile then Desktop.
// Same ordering as the sibling chart-area-legend recipe.
const DEFAULT_SERIES: ChartAreaIconsSeries[] = [
  {
    key: "mobile",
    label: "Mobile",
    tone: chartAreaSeriesColor(0).tone,
    icon: "up",
  },
  {
    key: "desktop",
    label: "Desktop",
    tone: chartAreaSeriesColor(1).tone,
    icon: "down",
  },
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
    content: {
      div: [
        chartAreaFrame(option, height),
        chartLegendRow(
          series.map((s) => ({
            label: s.label,
            color: "primary",
            tone: s.tone,
            icon: s.icon,
          })),
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

export { chartAreaIcons };
