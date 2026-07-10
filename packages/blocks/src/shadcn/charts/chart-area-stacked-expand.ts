// shadcn/ui "chart-area" (stacked-expand recipe) — clean-room reimplementation.
//
// A three-series stacked area chart normalized to a 0–100% share of total at
// every x position, so the combined height always fills the plot — turning
// absolute values into a proportion-of-total ribbon chart.
//
// FIDELITY NOTE: @domphy/chart's `stack` mechanism (see
// packages/chart/src/engine.ts accumStackedLines) only sums raw values into a
// cumulative baseline — there is no native "percent"/offset stacking mode
// (ECharts' `stack: "..."` + a percent axis type has no equivalent surfaced
// on LineSeriesOption/AxisOption here). This recipe approximates it by
// PRE-NORMALIZING each point to its percentage share before handing the data
// to the engine, then locking the y-axis to a fixed 0–100 domain so the
// stacked total is always flush with the plot's top edge. The tooltip is
// wired to show the underlying raw counts (via chartAxisTooltipFormatter's
// custom valueLabel) even though the plotted heights are the normalized
// shares, per the spec's behavior note.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_AREA_SERIES_PALETTE,
  CHART_AREA_THREE_SERIES_DATA,
  CHART_AREA_X_AXIS_BARE,
  type ChartAreaThreeSeriesPoint,
  type ChartTrendDirection,
  chartAreaFrame,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartTrendFooter,
} from "./chart-area-shared.js";

export interface ChartAreaStackedExpandSeries {
  key: "desktop" | "mobile" | "other";
  label: string;
  color: ThemeColor;
  opacity?: number;
}

export interface ChartAreaStackedExpandProps {
  data?: ChartAreaThreeSeriesPoint[];
  series?: ChartAreaStackedExpandSeries[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

// Declared bottom-to-top to match upstream's <Area> order (other → mobile →
// desktop): the engine stacks series[0] at the bottom, so the faint `other`
// band sits at the base and the primary `desktop` band on top, and the
// axis-tooltip rows list Other, Mobile, Desktop in this same order. Each key
// keeps its own palette color / opacity, so the ordering no longer coincides
// with the engine's rotation-by-position — the tooltip's color dot (driven by
// series position in the engine, not the configured color) is a known
// consequence of that, see chart-area-shared.ts's tooltip note.
const DEFAULT_SERIES: ChartAreaStackedExpandSeries[] = [
  // Minor category recedes visually at a lower opacity, per spec.
  {
    key: "other",
    label: "Other",
    color: CHART_AREA_SERIES_PALETTE[2],
    opacity: 0.1,
  },
  {
    key: "mobile",
    label: "Mobile",
    color: CHART_AREA_SERIES_PALETTE[1],
    opacity: 0.4,
  },
  {
    key: "desktop",
    label: "Desktop",
    color: CHART_AREA_SERIES_PALETTE[0],
    opacity: 0.4,
  },
];

/**
 * shadcn/ui "chart-area" stacked-expand recipe — three category series
 * normalized to a percent-of-total stack. Call with no arguments for a
 * working demo.
 */
function chartAreaStackedExpand(
  props: ChartAreaStackedExpandProps = {},
): DomphyElement<"div"> {
  const {
    data = CHART_AREA_THREE_SERIES_DATA,
    series = DEFAULT_SERIES,
    title = "Area Chart - Stacked Expand",
    description = "Showing traffic share by device for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = `${data[0]?.month ?? ""} - ${data[data.length - 1]?.month ?? ""} 2026`,
    height = 64,
  } = props;

  const categories = data.map((point) => point.month);

  // Raw counts per category, in series order — used to reconstitute the true
  // values in the tooltip since the plotted `data` below is normalized.
  const rawByIndex: number[][] = data.map((point) =>
    series.map((s) => point[s.key]),
  );
  const totalsByIndex = rawByIndex.map(
    (row) => row.reduce((sum, value) => sum + value, 0) || 1,
  );
  const percentData = series.map((s, _seriesIndex) =>
    data.map(
      (point, dataIndex) => (point[s.key] / totalsByIndex[dataIndex]) * 100,
    ),
  );

  const valueLabel = (p: TooltipParams) => {
    const raw = rawByIndex[p.dataIndex]?.[p.seriesIndex];
    return raw === undefined ? String(p.value ?? "") : String(raw);
  };

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      // Upstream passes `<ChartTooltipContent indicator="line" />`.
      formatter: chartAxisTooltipFormatter(
        categories,
        valueLabel,
        false,
        "line",
      ),
    },
    xAxis: { ...CHART_AREA_X_AXIS_BARE, data: categories },
    // Fixed 0–100 domain — the stack always fills the plot exactly. Chrome is
    // hidden but the horizontal split gridlines stay on, mirroring upstream's
    // `<CartesianGrid vertical={false} />`.
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: true },
    },
    grid: { left: 8, right: 8, top: 12, bottom: 24, containLabel: false },
    series: series.map((s, seriesIndex) => ({
      type: "line",
      name: s.label,
      stack: "share",
      smooth: true,
      showSymbol: false,
      color: s.color,
      lineStyle: { width: 2 },
      areaStyle: { opacity: s.opacity ?? 0.4 },
      data: percentData[seriesIndex],
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

export { chartAreaStackedExpand };
