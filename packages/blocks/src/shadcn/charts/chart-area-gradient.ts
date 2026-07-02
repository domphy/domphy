// shadcn/ui "chart-area" (gradient recipe) — clean-room reimplementation.
//
// A two-series area chart where each series' fill fades from a tinted top
// edge to fully transparent at the baseline, overlapping on the same
// baseline (not stacked) for a soft glow/wash look.
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
  chartAreaGradientFill,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartTrendFooter,
  type ChartAreaTwoSeriesPoint,
  type ChartTrendDirection,
} from "./chart-area-shared.js";

export interface ChartAreaGradientSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
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
  { key: "desktop", label: "Desktop", color: CHART_AREA_SERIES_PALETTE[0] },
  { key: "mobile", label: "Mobile", color: CHART_AREA_SERIES_PALETTE[1] },
];

/**
 * shadcn/ui "chart-area" gradient recipe — two overlapping area series,
 * each filled with a top-to-baseline fading gradient. Call with no
 * arguments for a working demo.
 */
function chartAreaGradient(props: ChartAreaGradientProps = {}): DomphyElement<"div"> {
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
      formatter: chartAxisTooltipFormatter(categories),
    },
    xAxis: { ...CHART_AREA_X_AXIS_BARE, data: categories },
    yAxis: CHART_AREA_Y_AXIS_HIDDEN,
    grid: { left: 8, right: 8, top: 12, bottom: 24, containLabel: false },
    series: series.map((s) => ({
      type: "line",
      name: s.label,
      smooth: true,
      showSymbol: false,
      color: s.color,
      lineStyle: { width: 2 },
      areaStyle: { color: chartAreaGradientFill(s.color), opacity: 1 },
      data: data.map((point) => point[s.key]),
    })),
  };

  return chartCardShell({
    title,
    description,
    content: { div: [chartAreaFrame(option, height)] },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartAreaGradient };
