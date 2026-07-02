// shadcn/ui "chart-area" (step recipe) — clean-room reimplementation.
//
// A single-series area chart whose outline/fill follows right-angle
// staircase steps between data points (horizontal-then-vertical segments)
// instead of a smooth or straight interpolation.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_AREA_MONTHLY_DATA,
  CHART_AREA_X_AXIS_BARE,
  CHART_AREA_Y_AXIS_HIDDEN,
  chartAreaFrame,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartTrendFooter,
  chartTrendIcon,
  type ChartAreaSinglePoint,
  type ChartTrendDirection,
} from "./chart-area-shared.js";

export interface ChartAreaStepProps {
  data?: ChartAreaSinglePoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  /** Icon shown on the series in the footer instead of a plain trend arrow — demonstrates attaching an icon to the series definition. */
  seriesIcon?: ChartTrendDirection;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

/**
 * shadcn/ui "chart-area" step recipe — a single-series staircase area
 * chart. Call with no arguments for a working demo.
 */
function chartAreaStep(props: ChartAreaStepProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_AREA_MONTHLY_DATA,
    seriesLabel = "Visitors",
    seriesColor = "primary",
    seriesIcon,
    title = "Area Chart - Step",
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
      axisPointer: { snap: true },
      formatter: chartAxisTooltipFormatter(categories, (p) => `${p.value} visitors`),
    },
    xAxis: { ...CHART_AREA_X_AXIS_BARE, data: categories },
    yAxis: CHART_AREA_Y_AXIS_HIDDEN,
    grid: { left: 8, right: 8, top: 12, bottom: 24, containLabel: false },
    series: [
      {
        type: "line",
        name: seriesLabel,
        // Horizontal-then-vertical staircase between points.
        step: "end",
        showSymbol: false,
        color: seriesColor,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.4 },
        data: data.map((point) => point.value),
      },
    ],
  };

  return chartCardShell({
    title,
    description,
    content: { div: [chartAreaFrame(option, height)] },
    footer: chartTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
      color: seriesColor,
      trendIconOverride: seriesIcon ? chartTrendIcon(seriesIcon, seriesColor) : undefined,
    }),
  });
}

export { chartAreaStep };
