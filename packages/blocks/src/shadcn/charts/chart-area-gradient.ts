// shadcn/ui "chart-area" (gradient recipe) — clean-room reimplementation.
//
// A two-series stacked area chart where each series' fill fades from a tinted
// top edge toward transparent at its own band's baseline, giving a soft
// layered glow/wash look.
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

export interface ChartAreaGradientSeries {
  key: "desktop" | "mobile";
  label: string;
  /** Ramp tone within the primary family (approximates var(--chart-N)). */
  tone: ChartAreaSeriesTone;
}

export interface ChartAreaGradientProps {
  data?: ChartAreaTwoSeriesPoint[];
  series?: ChartAreaGradientSeries[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartAreaGradientSeries[] = [
  { key: "mobile", label: "Mobile", tone: chartAreaSeriesColor(0).tone },
  { key: "desktop", label: "Desktop", tone: chartAreaSeriesColor(1).tone },
];

/**
 * shadcn/ui "chart-area" gradient recipe — two overlapping area series,
 * each filled with a top-to-baseline fading gradient. Call with no
 * arguments for a working demo.
 */
function chartAreaGradient(
  props: ChartAreaGradientProps = {},
): DomphyElement<"div"> {
  const {
    data = CHART_AREA_TWO_SERIES_DATA,
    series = DEFAULT_SERIES,
    title = "Area Chart - Gradient",
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
      stack: "total",
      smooth: true,
      showSymbol: false,
      // The engine pins strokes to the family at shift-9; the ramp step is
      // approximated via stroke opacity, and the gradient carries the tone.
      color: "primary",
      lineStyle: {
        width: 2,
        opacity: chartAreaSeriesColor(seriesIndex).strokeOpacity,
      },
      areaStyle: {
        // The gradient's own alphas (0.8→0.1) already encode the fade —
        // multiplying by an extra 0.4 opacity washes the fill out to white.
        color: chartAreaGradientFill("primary", 0.8, 0.1, s.tone),
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

export { chartAreaGradient };
