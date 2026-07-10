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

import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  type ChartBarCategoryPoint,
  type ChartBarGrid,
  type ChartTrendDirection,
  chartBarActiveOverlay,
  chartBarCardShell,
  chartBarCategoryXAxis,
  chartBarColorHex,
  chartBarFrame,
  chartBarHiddenValueYAxis,
  chartBarTooltipRow,
  chartBarTrendFooter,
  chartBarValueDomain,
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

// The active recipe carries its OWN dataset — distinct from the mixed recipe's
// shared CHART_BAR_BROWSER_DATA — so the pre-selected bar at index 2 (Firefox)
// is the tallest peak, giving the dashed "active" outline something prominent
// to sit on. Per-browser accent colors are kept identical to the mixed recipe
// (color follows browser identity, not value rank).
const CHART_BAR_ACTIVE_DATA: ChartBarCategoryPoint[] = [
  { category: "Chrome", value: 187, color: "primary" },
  { category: "Safari", value: 200, color: "secondary" },
  { category: "Firefox", value: 275, color: "success" },
  { category: "Edge", value: 173, color: "warning" },
  { category: "Other", value: 90, color: "info" },
];

/**
 * shadcn/ui "chart-bar" active recipe — a fixed bar carries a dashed-stroke
 * "selected" outline instead of relying on hover. Call with no arguments for
 * a working demo.
 */
function chartBarActive(props: ChartBarActiveProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_ACTIVE_DATA,
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
  const clampedActiveIndex = Math.max(
    0,
    Math.min(data.length - 1, activeIndex),
  );
  const barColor = (index: number): ThemeColor =>
    data[index]?.color ?? seriesColor;

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      // The standard shaded cursor rectangle is turned off entirely so the
      // pre-set active bar's dashed outline is the only visual emphasis.
      axisPointer: { type: "none" },
      // Upstream renders this recipe's tooltip with <ChartTooltipContent
      // hideLabel /> — the category header (e.g. "Firefox") is suppressed, so
      // only the single series dot + "Visitors" + value row shows.
      formatter: chartBarActiveTooltipFormatter,
    },
    xAxis: chartBarCategoryXAxis(categories),
    yAxis: chartBarHiddenValueYAxis({
      min: valueDomain[0],
      max: valueDomain[1],
    }),
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
    footer: chartBarTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
    }),
  });
}

function escapeTooltipHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// hideLabel formatter: omits the category header line, printing only the
// single series' color dot + name + value (mirrors chart-bar-default's
// chartBarDefaultTooltipFormatter and upstream's <ChartTooltipContent
// hideLabel />).
function chartBarActiveTooltipFormatter(
  parametersInput: TooltipParams | TooltipParams[],
): string {
  const parameters = Array.isArray(parametersInput)
    ? parametersInput
    : [parametersInput];
  if (parameters.length === 0) return "";
  const item = parameters[0];
  const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px;"></span>`;
  const label = escapeTooltipHtml(String(item.seriesName ?? item.name ?? ""));
  const value = escapeTooltipHtml(String(item.value ?? ""));
  return chartBarTooltipRow(dot, label, value);
}

export { chartBarActive };
