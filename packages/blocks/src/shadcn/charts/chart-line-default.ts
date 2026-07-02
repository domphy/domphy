// shadcn/ui "charts/line" (default) block — clean-room reimplementation.
//
// A single-series smoothed line chart inside a titled card: six months of
// visitor data, horizontal-only gridlines, no y-axis, a bottom month axis
// with no axis line/ticks, and a bold trend sentence + up/down arrow in the
// footer. Hovering the plot shows a bare numeric value tooltip with no
// cursor highlight band.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import type { ChartOption } from "@domphy/chart";
import {
  DEFAULT_LINE_GRID,
  MONTHLY_VISITOR_DATA,
  type MonthlyPoint,
  bareValueTooltipFormatter,
  chartCard,
  chartPlot,
  computeYDomain,
  hiddenLabelYAxis,
  monthCategoryXAxis,
  trendFooter,
} from "./chart-line-shared.js";

/** Props for {@link chartLineDefault}. */
export interface ChartLineDefaultProps {
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
 * shadcn/ui "charts/line" (default) — a titled card holding a smoothed
 * single-series line chart with a trend callout footer. Call with no
 * arguments for a fully working demo.
 */
function chartLineDefault(props: ChartLineDefaultProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart",
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
      formatter: bareValueTooltipFormatter,
    },
    series: [
      {
        type: "line",
        name: seriesLabel,
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
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

export { chartLineDefault };
