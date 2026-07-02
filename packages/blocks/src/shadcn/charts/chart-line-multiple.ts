// shadcn/ui "charts/line-multiple" block — clean-room reimplementation.
//
// Two smoothed lines (two series) plotted on the same six-month chart, each
// in its own accent color, with no point markers. Hovering shows the
// engine's default richer tooltip: a color swatch + series label + value per
// line for the hovered month, with the cursor highlight band suppressed.
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
  chartCard,
  chartPlot,
  computeYDomain,
  hiddenLabelYAxis,
  monthCategoryXAxis,
  trendFooter,
} from "./chart-line-shared.js";

/** Props for {@link chartLineMultiple}. */
export interface ChartLineMultipleProps {
  title?: string;
  description?: string;
  primarySeriesLabel?: string;
  primarySeriesColor?: ThemeColor;
  secondarySeriesLabel?: string;
  secondarySeriesColor?: ThemeColor;
  data?: MonthlyPoint[];
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-multiple" — two smoothed lines sharing one
 * six-month category axis, with a richer per-series hover tooltip. Call with
 * no arguments for a fully working demo.
 */
function chartLineMultiple(props: ChartLineMultipleProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Multiple",
    description = "January - June 2026",
    primarySeriesLabel = "Desktop",
    primarySeriesColor = "primary",
    secondarySeriesLabel = "Mobile",
    secondarySeriesColor = "secondary",
    data = MONTHLY_VISITOR_DATA,
    trendHeadline = "Trending up by 5.2% this month",
    trendSubtitle = "Showing total visitors for the last 6 months",
    trendDirection = "up",
  } = props;

  const categories = data.map((point) => point.month);
  const desktopValues = data.map((point) => point.desktop);
  const mobileValues = data.map((point) => point.mobile);
  const yDomain = computeYDomain([...desktopValues, ...mobileValues]);

  const option: ChartOption = {
    grid: DEFAULT_LINE_GRID,
    xAxis: monthCategoryXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
    },
    series: [
      {
        type: "line",
        name: primarySeriesLabel,
        data: desktopValues,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        color: primarySeriesColor,
      },
      {
        type: "line",
        name: secondarySeriesLabel,
        data: mobileValues,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        color: secondarySeriesColor,
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

export { chartLineMultiple };
