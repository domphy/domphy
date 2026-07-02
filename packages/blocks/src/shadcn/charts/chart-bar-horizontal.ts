// shadcn/ui "chart-bar" (horizontal recipe) — clean-room reimplementation.
//
// The same single-series monthly dataset as the default recipe, rotated so
// each month is a row with a bar extending rightward from a left category
// axis; the numeric axis is fully hidden.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_MONTHLY_DATA,
  chartBarCardShell,
  chartBarCategoryYAxis,
  chartBarFrame,
  chartBarHiddenValueXAxis,
  chartBarHorizontalHoverOverlay,
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarGrid,
  type ChartBarPoint,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarHorizontalProps {
  data?: ChartBarPoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  /** Max characters kept from each category label before truncation. */
  categoryTruncateLength?: number;
  grid?: ChartBarGrid;
  height?: number;
}

const DEFAULT_GRID: ChartBarGrid = { left: 44, right: 16, top: 8, bottom: 8 };

/**
 * shadcn/ui "chart-bar" horizontal recipe — the default recipe's dataset
 * rotated into rightward-extending rows against a left category axis. Call
 * with no arguments for a working demo.
 */
function chartBarHorizontal(props: ChartBarHorizontalProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_MONTHLY_DATA,
    seriesLabel = "Desktop",
    seriesColor = "primary",
    title = "Bar Chart - Horizontal",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    categoryTruncateLength = 12,
    grid = DEFAULT_GRID,
    height = 64,
  } = props;

  // Category (y) axes render bottom-to-top — reverse the data order so the
  // on-screen reading order (top-to-bottom) stays chronological. See the
  // file-level fidelity note in chart-bar-shared.ts.
  const orderedData = [...data].reverse();
  const categories = orderedData.map((point) => point.label.slice(0, categoryTruncateLength));
  const values = orderedData.map((point) => point.value);
  const [, domainMax] = chartBarValueDomain(values);

  const option: ChartOption = {
    tooltip: { show: false },
    xAxis: chartBarHiddenValueXAxis({ min: 0, max: domainMax }),
    yAxis: chartBarCategoryYAxis(categories),
    grid,
    series: [
      {
        type: "bar",
        name: seriesLabel,
        color: seriesColor,
        itemStyle: { borderRadius: [0, 5, 5, 0] },
        data: values,
      },
    ],
  };

  return chartBarCardShell({
    title,
    subtitle,
    content: {
      div: [
        chartBarFrame(option, {
          height,
          overlays: [
            chartBarHorizontalHoverOverlay({
              categories,
              grid,
              valueLabel: (index) => String(values[index] ?? ""),
            }),
          ],
        }),
      ],
    },
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartBarHorizontal };
