// shadcn/ui "charts/line-linear" block — clean-room reimplementation.
//
// Same single-series six-month chart as chartLineDefault, but the segments
// between points are drawn as straight edges (visible angular joints at each
// month) instead of a smoothed curve. Everything else — card chrome, grid,
// axis, tooltip and footer — is unchanged.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  chartCard,
  chartLineSeriesColor,
  chartPlot,
  computeYDomain,
  DEFAULT_LINE_GRID,
  hiddenLabelYAxis,
  lineSwatchLabelValueTooltipFormatter,
  MONTHLY_VISITOR_DATA,
  type MonthlyPoint,
  monthCategoryXAxis,
  trendFooter,
} from "./chart-line-shared.js";

/** Props for {@link chartLineLinear}. */
export interface ChartLineLinearProps {
  title?: string;
  description?: string;
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  data?: MonthlyPoint[];
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-linear" — the default single-line chart with
 * straight segments between points instead of a smoothed curve. Call with no
 * arguments for a fully working demo.
 */
function chartLineLinear(
  props: ChartLineLinearProps = {},
): DomphyElement<"div"> {
  const {
    title = "Line Chart - Linear",
    description = "January - June 2026",
    seriesLabel = "Desktop",
    seriesColor = "primary",
    data = MONTHLY_VISITOR_DATA,
    trendHeadline = "Trending up by 5.2% this month",
    trendSubtitle = "Showing total visitors for the last 6 months",
    trendDirection = "up",
  } = props;

  const categories = data.map((point) => point.month);
  const values = data.map((point) => point.desktop);
  const yDomain = computeYDomain(values);

  const option: ChartOption = {
    grid: DEFAULT_LINE_GRID,
    xAxis: monthCategoryXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: (params) =>
        lineSwatchLabelValueTooltipFormatter(
          params,
          chartLineSeriesColor(0).css,
        ),
    },
    series: [
      {
        type: "line",
        name: seriesLabel,
        data: values,
        smooth: false,
        step: false,
        showSymbol: false,
        // Upstream's stroke is var(--chart-1): the engine pins strokes to
        // shift-9, so the ramp step is approximated via stroke opacity.
        lineStyle: { width: 2, opacity: chartLineSeriesColor(0).strokeOpacity },
        color: seriesColor,
      },
    ],
  };

  return chartCard({
    title,
    description,
    plot: chartPlot({ option }),
    footer: trendFooter({
      headline: trendHeadline,
      subtitle: trendSubtitle,
      direction: trendDirection,
    }),
  });
}

export { chartLineLinear };
