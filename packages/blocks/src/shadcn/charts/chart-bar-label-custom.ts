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

import type { ChartOption } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_TWO_SERIES_DATA,
  type ChartBarGrid,
  type ChartBarTwoSeriesPoint,
  type ChartTrendDirection,
  chartBarCardShell,
  chartBarColorHex,
  chartBarFrame,
  chartBarHorizontalHoverOverlay,
  chartBarInsideOutsideLabelOverlay,
  chartBarTooltipRow,
  chartBarTrendFooter,
  chartBarValueDomain,
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

// Upstream prints the FULL month name inside each bar — its LabelList
// (dataKey="month") has no formatter; only the hidden YAxis abbreviates via
// slice(0,3). The shared demo dataset stores abbreviated labels, so expand
// them for display here; any custom label that isn't a month abbreviation
// falls through unchanged.
const MONTH_NAMES: Record<string, string> = {
  Jan: "January",
  Feb: "February",
  Mar: "March",
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
};

/**
 * shadcn/ui "chart-bar" custom-label recipe — inside category label +
 * outside value label, no visible axes. Call with no arguments for a
 * working demo.
 */
function chartBarLabelCustom(
  props: ChartBarLabelCustomProps = {},
): DomphyElement<"div"> {
  const {
    data = CHART_BAR_TWO_SERIES_DATA,
    seriesLabel = "Desktop",
    seriesColor = "secondary",
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
  const categories = orderedData.map(
    (point) => MONTH_NAMES[point.label] ?? point.label,
  );
  const values = orderedData.map((point) => point.desktop);
  const valueDomain = chartBarValueDomain(values);
  const seriesColorHex = chartBarColorHex(seriesColor);

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
              // Upstream fills the inside label with var(--background) (a
              // neutral, near-background color) — not the series hue. Neutral
              // shift-1 is the closest role match the shared overlay exposes.
              insideColor: "neutral",
              insideLabel: (index) => categories[index] ?? "",
              outsideLabel: (index) => String(values[index] ?? ""),
            }),
            chartBarHorizontalHoverOverlay({
              categories,
              grid,
              showCategoryTitle: true,
              // Match upstream ChartTooltipContent indicator="line": a thin
              // line swatch in the series color + the series name + the value.
              valueLabel: (index) =>
                chartBarTooltipRow(
                  `<span style="display:inline-block;width:3px;height:11px;border-radius:1px;background:${seriesColorHex};margin-right:6px;vertical-align:middle;"></span>`,
                  seriesLabel,
                  String(values[index] ?? ""),
                ),
            }),
          ],
        }),
      ],
    },
    footer: chartBarTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
    }),
  });
}

export { chartBarLabelCustom };
