// shadcn/ui "chart-area" (axes recipe) — clean-room reimplementation.
//
// The same two-series area chart as the gradient/legend recipes, but with a
// visible y-axis (a sparse handful of value labels) alongside the x-axis
// month labels, plus faint horizontal-only background gridlines. Neither
// axis draws a heavy line or tick marks — just floating text labels near the
// plot edges.
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
  chartAreaFrame,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartTrendFooter,
  type ChartAreaTwoSeriesPoint,
  type ChartTrendDirection,
} from "./chart-area-shared.js";

export interface ChartAreaAxesSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
}

export interface ChartAreaAxesProps {
  data?: ChartAreaTwoSeriesPoint[];
  series?: ChartAreaAxesSeries[];
  /** Number of y-axis ticks to show. Defaults to a sparse 3. */
  yAxisTickCount?: number;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

// Declaration order sets the stack band arrangement: the engine draws
// series[0] at the baseline (bottom band). Upstream declares Area(mobile)
// before Area(desktop) under one stackId, so mobile is the bottom band and
// desktop sits on top. Each key keeps its own color (mobile → chart-2,
// desktop → chart-1), so the fill bands match upstream and the tooltip lists
// mobile then desktop.
const DEFAULT_SERIES: ChartAreaAxesSeries[] = [
  { key: "mobile", label: "Mobile", color: CHART_AREA_SERIES_PALETTE[1] },
  { key: "desktop", label: "Desktop", color: CHART_AREA_SERIES_PALETTE[0] },
];

/**
 * shadcn/ui "chart-area" axes recipe — a two-series area chart with a
 * sparse y-axis and horizontal-only gridlines. Call with no arguments for a
 * working demo.
 */
function chartAreaAxes(props: ChartAreaAxesProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_AREA_TWO_SERIES_DATA,
    series = DEFAULT_SERIES,
    yAxisTickCount = 3,
    title = "Area Chart - Axes",
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
    yAxis: {
      type: "value",
      splitNumber: yAxisTickCount,
      axisLine: { show: false },
      axisTick: { show: false },
      // Horizontal-only gridlines — the x-axis above keeps its splitLine off.
      splitLine: { show: true },
    },
    grid: { left: 40, right: 8, top: 12, bottom: 24, containLabel: false },
    series: series.map((s) => ({
      type: "line",
      name: s.label,
      stack: "total",
      smooth: true,
      showSymbol: false,
      color: s.color,
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.4 },
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

export { chartAreaAxes };
