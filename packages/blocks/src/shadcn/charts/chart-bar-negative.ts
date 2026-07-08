// shadcn/ui "chart-bar" (negative recipe) — clean-room reimplementation.
//
// A single-series bar chart whose bars diverge above or below a zero
// baseline depending on sign, colored differently for gains vs losses, with
// each month's label printed just outside its own bar's tip instead of on a
// conventional axis row.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_NEGATIVE_DATA,
  chartBarCardShell,
  chartBarColorHex,
  chartBarFrame,
  chartBarSignedDomain,
  chartBarSignedLabelOverlay,
  chartBarTooltipRow,
  chartBarTrendFooter,
  type ChartBarGrid,
  type ChartBarPoint,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarNegativeProps {
  data?: ChartBarPoint[];
  seriesLabel?: string;
  positiveColor?: ThemeColor;
  negativeColor?: ThemeColor;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

const GRID: ChartBarGrid = { left: 8, right: 8, top: 28, bottom: 28 };

/**
 * shadcn/ui "chart-bar" negative recipe — bars diverge above/below a zero
 * baseline, colored by sign. Call with no arguments for a working demo.
 */
function chartBarNegative(props: ChartBarNegativeProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_NEGATIVE_DATA,
    seriesLabel = "Visitors",
    positiveColor = "primary",
    // Upstream fills negative bars with var(--chart-2); this family maps
    // chart-2 to the 'secondary' role (see CHART_BAR_SERIES_PALETTE).
    negativeColor = "secondary",
    title = "Bar Chart - Negative",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing visitor change for the last 6 months",
    height = 64,
  } = props;

  const categories = data.map((point) => point.label);
  const values = data.map((point) => point.value);
  const valueDomain = chartBarSignedDomain(values);
  const positiveHex = chartBarColorHex(positiveColor);
  const negativeHex = chartBarColorHex(negativeColor);

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      // Upstream renders this recipe's tooltip with hideLabel + hideIndicator —
      // the month name and color dot are both dropped, only the series name +
      // value line shows.
      formatter: chartBarNegativeTooltipFormatter(seriesLabel),
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: valueDomain[0],
      max: valueDomain[1],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: true },
    },
    grid: GRID,
    series: [
      {
        type: "bar",
        name: seriesLabel,
        // Zero baseline — a distinct dashed reference line the diverging
        // bars grow away from in either direction.
        markLine: { data: [[{ yAxis: 0 }, { yAxis: 0 }]] },
        data: values.map((value) => ({
          value,
          itemStyle: { color: value > 0 ? positiveHex : negativeHex },
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
          overlays: [chartBarSignedLabelOverlay({ categories, values, valueDomain, grid: GRID })],
        }),
      ],
    },
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

function escapeTooltipHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function chartBarNegativeTooltipFormatter(
  seriesLabel: string,
): (parametersInput: TooltipParams | TooltipParams[]) => string {
  return (parametersInput) => {
    const parameters = Array.isArray(parametersInput) ? parametersInput : [parametersInput];
    if (parameters.length === 0) return "";
    const value = escapeTooltipHtml(String(parameters[0].value ?? ""));
    // Upstream negative chart: <ChartTooltipContent hideLabel hideIndicator />
    // — no swatch, name muted, value mono medium foreground.
    return chartBarTooltipRow("", escapeTooltipHtml(seriesLabel), value);
  };
}

export { chartBarNegative };
