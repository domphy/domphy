// shadcn/ui "chart-bar" (custom label recipe) — clean-room reimplementation.
//
// A horizontal single-series bar chart with both axes fully hidden: each
// bar prints its own category name near its inside-left edge (in a light,
// on-fill-legible color) and its numeric value just past its right end (in
// the normal foreground color), so the chart is self-describing without
// visible axis chrome.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_TWO_SERIES_DATA,
  chartBarCardShell,
  chartBarFrame,
  chartBarHorizontalHoverOverlay,
  chartBarInsideOutsideLabelOverlay,
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarGrid,
  type ChartBarTwoSeriesPoint,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarLabelCustomProps {
  data?: ChartBarTwoSeriesPoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  grid?: ChartBarGrid;
  height?: number;
}

const DEFAULT_GRID: ChartBarGrid = { left: 8, right: 48, top: 8, bottom: 8 };

/**
 * shadcn/ui "chart-bar" custom-label recipe — inside category label +
 * outside value label, no visible axes. Call with no arguments for a
 * working demo.
 */
function chartBarLabelCustom(props: ChartBarLabelCustomProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_TWO_SERIES_DATA,
    seriesLabel = "Desktop",
    seriesColor = "primary",
    title = "Bar Chart - Custom Label",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    grid = DEFAULT_GRID,
    height = 64,
  } = props;

  // Category (y) axes render bottom-to-top — reverse so the on-screen
  // reading order stays chronological.
  const orderedData = [...data].reverse();
  const categories = orderedData.map((point) => point.label);
  const values = orderedData.map((point) => point.desktop);
  const valueDomain = chartBarValueDomain(values);

  const option: ChartOption = {
    tooltip: { show: false },
    xAxis: {
      type: "value",
      min: valueDomain[0],
      max: valueDomain[1],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: true },
    },
    yAxis: {
      type: "category",
      data: categories,
      show: false,
    },
    grid,
    series: [
      {
        type: "bar",
        name: seriesLabel,
        color: seriesColor,
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
            chartBarInsideOutsideLabelOverlay({
              categories,
              values,
              valueDomain,
              grid,
              insideColor: seriesColor,
              insideLabel: (index) => categories[index] ?? "",
              outsideLabel: (index) => String(values[index] ?? ""),
            }),
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

export { chartBarLabelCustom };
