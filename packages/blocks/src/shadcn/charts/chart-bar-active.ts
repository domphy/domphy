// shadcn/ui "chart-bar" (active recipe) — clean-room reimplementation.
//
// A vertical multi-color bar chart (each bar carries its own accent color)
// where one pre-selected bar is deliberately emphasized with a bold dashed
// outline in that bar's own color (rather than relying on hover), and the
// standard hover-tooltip cursor rectangle is disabled so the dashed bar
// reads as a persistent "selected" state.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_BROWSER_DATA,
  chartBarActiveOverlay,
  chartBarAxisTooltipFormatter,
  chartBarCardShell,
  chartBarCategoryXAxis,
  chartBarColorHex,
  chartBarFrame,
  chartBarHiddenValueYAxis,
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarCategoryPoint,
  type ChartBarGrid,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarActiveProps {
  data?: ChartBarCategoryPoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  /** Index of the bar rendered with the dashed-outline "active" treatment. */
  activeIndex?: number;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const GRID: ChartBarGrid = { left: 8, right: 8, top: 16, bottom: 24 };

/**
 * shadcn/ui "chart-bar" active recipe — a fixed bar carries a dashed-stroke
 * "selected" outline instead of relying on hover. Call with no arguments for
 * a working demo.
 */
function chartBarActive(props: ChartBarActiveProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_BROWSER_DATA,
    seriesLabel = "Visitors",
    seriesColor = "primary",
    activeIndex = 2,
    title = "Bar Chart - Active",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors by browser",
    height = 64,
  } = props;

  const categories = data.map((point) => point.category);
  const values = data.map((point) => point.value);
  const valueDomain = chartBarValueDomain(values);
  const clampedActiveIndex = Math.max(0, Math.min(data.length - 1, activeIndex));
  const barColor = (index: number): ThemeColor => data[index]?.color ?? seriesColor;

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      // The standard shaded cursor rectangle is turned off entirely so the
      // pre-set active bar's dashed outline is the only visual emphasis.
      axisPointer: { type: "none" },
      formatter: chartBarAxisTooltipFormatter(categories),
    },
    xAxis: chartBarCategoryXAxis(categories),
    yAxis: chartBarHiddenValueYAxis({ min: valueDomain[0], max: valueDomain[1] }),
    grid: GRID,
    // Every bar carries its own accent color — upstream's active recipe is a
    // multi-color chart, not a single-hue one; one bar is then singled out by
    // the dashed overlay below (drawn in that same bar's color).
    series: [
      {
        type: "bar",
        name: seriesLabel,
        data: data.map((point, index) => ({
          value: point.value,
          itemStyle: { color: chartBarColorHex(barColor(index)) },
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
            chartBarActiveOverlay({
              categories,
              values,
              valueDomain,
              grid: GRID,
              activeIndex: clampedActiveIndex,
              color: barColor(clampedActiveIndex),
            }),
          ],
        }),
      ],
    },
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartBarActive };
