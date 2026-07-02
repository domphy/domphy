// shadcn/ui "charts/line-dots" block — clean-room reimplementation.
//
// The default smooth single-line chart with a filled circular dot at every
// data point, plus a larger marker that grows in near the cursor on hover.
// The resting dots come from @domphy/chart's built-in line-symbol renderer;
// the enlarging hover marker is a small companion SVG overlay (see
// ./chart-line-shared.ts for why one is needed) positioned with the same
// public scale factories the engine itself uses.
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
  hoverDotOverlay,
  monthCategoryXAxis,
  trendFooter,
} from "./chart-line-shared.js";

const REST_DOT_RADIUS = 4;
const ACTIVE_DOT_RADIUS = 8;

/** Props for {@link chartLineDots}. */
export interface ChartLineDotsProps {
  title?: string;
  description?: string;
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  data?: MonthlyPoint[];
  dotRadius?: number;
  activeDotRadius?: number;
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-dots" — the default single-line chart with a dot at
 * every point and a hover-enlarging active marker. Call with no arguments
 * for a fully working demo.
 */
function chartLineDots(props: ChartLineDotsProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Dots",
    description = "January - June 2026",
    seriesLabel = "Desktop",
    seriesColor = "primary",
    data = MONTHLY_VISITOR_DATA,
    dotRadius = REST_DOT_RADIUS,
    activeDotRadius = ACTIVE_DOT_RADIUS,
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
        showSymbol: true,
        symbolSize: dotRadius * 2,
        lineStyle: { width: 2 },
        color: seriesColor,
      },
    ],
  };

  return chartCard({
    title,
    description,
    plot: chartPlot({
      option,
      overlays: [
        hoverDotOverlay({
          categories,
          values,
          yDomain,
          grid: DEFAULT_LINE_GRID,
          color: seriesColor,
          radius: activeDotRadius,
        }),
      ],
    }),
    footer: trendFooter({
      headline: trendHeadline,
      subtitle: trendSubtitle,
      direction: trendDirection,
    }),
  });
}

export { chartLineDots };
