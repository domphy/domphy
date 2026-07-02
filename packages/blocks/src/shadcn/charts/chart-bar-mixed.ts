// shadcn/ui "chart-bar" (mixed recipe) — clean-room reimplementation.
//
// A horizontal single-series bar chart where every bar carries its own
// distinct accent color instead of sharing one uniform fill, so the chart
// reads like a small color-coded ranking; the axis labels double as the key
// (no separate legend).
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_BROWSER_DATA,
  CHART_BAR_SERIES_PALETTE,
  chartBarCardShell,
  chartBarCategoryYAxis,
  chartBarColorHex,
  chartBarFrame,
  chartBarHiddenValueXAxis,
  chartBarHorizontalHoverOverlay,
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarCategoryPoint,
  type ChartBarGrid,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarMixedProps {
  data?: ChartBarCategoryPoint[];
  seriesLabel?: string;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  grid?: ChartBarGrid;
  height?: number;
}

const DEFAULT_GRID: ChartBarGrid = { left: 64, right: 16, top: 8, bottom: 8 };

/**
 * shadcn/ui "chart-bar" mixed recipe — each row gets its own accent color.
 * Call with no arguments for a working demo.
 */
function chartBarMixed(props: ChartBarMixedProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_BROWSER_DATA,
    seriesLabel = "Visitors",
    title = "Bar Chart - Mixed",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors by browser",
    grid = DEFAULT_GRID,
    height = 64,
  } = props;

  // Category (y) axes render bottom-to-top — reverse so the ranking reads
  // top-to-bottom in the given data order.
  const orderedData = [...data].reverse();
  const categories = orderedData.map((point) => point.category);
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
        itemStyle: { borderRadius: [0, 5, 5, 0] },
        data: orderedData.map((point, index) => ({
          value: point.value,
          itemStyle: {
            color: chartBarColorHex(point.color ?? CHART_BAR_SERIES_PALETTE[index % CHART_BAR_SERIES_PALETTE.length] as ThemeColor),
          },
        })),
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
              showCategoryTitle: true,
              valueLabel: (index) => String(values[index] ?? ""),
            }),
          ],
        }),
      ],
    },
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartBarMixed };
