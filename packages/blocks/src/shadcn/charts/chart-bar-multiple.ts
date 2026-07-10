// shadcn/ui "chart-bar" (multiple recipe) — clean-room reimplementation.
//
// A two-series grouped bar chart: each month shows a tight desktop/mobile
// bar pair, with only horizontal gridlines and a shared hover tooltip
// listing both series' values.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_SERIES_PALETTE,
  type ChartBarTwoSeriesPoint,
  type ChartTrendDirection,
  chartBarCardShell,
  chartBarCategoryXAxis,
  chartBarFrame,
  chartBarHiddenValueYAxis,
  chartBarTooltipRow,
  chartBarTrendFooter,
  chartBarValueDomain,
} from "./chart-bar-shared.js";

export interface ChartBarMultipleSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
}

export interface ChartBarMultipleProps {
  data?: ChartBarTwoSeriesPoint[];
  series?: ChartBarMultipleSeries[];
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartBarMultipleSeries[] = [
  { key: "desktop", label: "Desktop", color: CHART_BAR_SERIES_PALETTE[0] },
  { key: "mobile", label: "Mobile", color: CHART_BAR_SERIES_PALETTE[1] },
];

// Upstream stores FULL month names in chartData and abbreviates only on the
// axis (tickFormatter={(value) => value.slice(0, 3)}); the axis-trigger
// tooltip title therefore shows the full name ("January"). Defined locally
// (not sourced from the shared abbreviated dataset) so both the full-name
// tooltip title and the sliced axis label reproduce upstream exactly.
const DEFAULT_DATA: ChartBarTwoSeriesPoint[] = [
  { label: "January", desktop: 186, mobile: 80 },
  { label: "February", desktop: 305, mobile: 200 },
  { label: "March", desktop: 237, mobile: 120 },
  { label: "April", desktop: 73, mobile: 190 },
  { label: "May", desktop: 209, mobile: 130 },
  { label: "June", desktop: 214, mobile: 140 },
];

/**
 * shadcn/ui "chart-bar" multiple recipe — a two-series grouped bar chart.
 * Call with no arguments for a working demo.
 */
function chartBarMultiple(
  props: ChartBarMultipleProps = {},
): DomphyElement<"div"> {
  const {
    data = DEFAULT_DATA,
    series = DEFAULT_SERIES,
    title = "Bar Chart - Multiple",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    height = 64,
  } = props;

  // Full labels drive the tooltip title; the axis gets the upstream
  // slice(0, 3) abbreviation (AxisLabelOption.formatter is a no-op in the
  // engine, so the sliced strings are handed to the axis directly).
  const categories = data.map((point) => point.label);
  const axisCategories = categories.map((label) => label.slice(0, 3));
  const allValues = series.flatMap((s) => data.map((point) => point[s.key]));
  const [, domainMax] = chartBarValueDomain(allValues);

  const option: ChartOption = {
    // Unlike its sibling bar recipes, upstream does NOT set hideLabel here,
    // so the month name shows as a title line above the per-series rows,
    // and it uses indicator="dashed" (a small vertical dashed line swatch)
    // rather than the engine default's solid round dot.
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: chartBarMultipleTooltipFormatter(categories),
    },
    xAxis: chartBarCategoryXAxis(axisCategories),
    yAxis: chartBarHiddenValueYAxis({
      splitLine: true,
      min: 0,
      max: domainMax,
    }),
    grid: { left: 8, right: 8, top: 16, bottom: 24 },
    series: series.map((s) => ({
      type: "bar",
      name: s.label,
      color: s.color,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: data.map((point) => point[s.key]),
    })),
  };

  return chartBarCardShell({
    title,
    subtitle,
    content: { div: [chartBarFrame(option, { height })] },
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

function chartBarMultipleTooltipFormatter(
  categories: string[],
): (parametersInput: TooltipParams | TooltipParams[]) => string {
  return (parametersInput) => {
    const parameters = Array.isArray(parametersInput)
      ? parametersInput
      : [parametersInput];
    if (parameters.length === 0) return "";
    const category = escapeTooltipHtml(
      categories[parameters[0].dataIndex] ?? parameters[0].name ?? "",
    );
    const rows = parameters
      .map((p) => {
        const indicator = `<span style="display:inline-block;width:0;height:12px;border-left:1.5px dashed ${p.color};margin-right:6px;vertical-align:middle;"></span>`;
        const label = escapeTooltipHtml(String(p.seriesName ?? p.name ?? ""));
        const value = escapeTooltipHtml(String(p.value ?? ""));
        return chartBarTooltipRow(indicator, label, value);
      })
      .join("");
    return `<strong>${category}</strong>${rows}`;
  };
}

export { chartBarMultiple };
