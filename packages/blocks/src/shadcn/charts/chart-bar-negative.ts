// shadcn/ui "chart-bar" (negative recipe) — clean-room reimplementation.
//
// A single-series bar chart whose bars diverge above or below a zero
// baseline depending on sign, colored differently for gains vs losses, with
// each month's label printed just outside its own bar's tip instead of on a
// conventional axis row.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import {
  CHART_BAR_NEGATIVE_DATA,
  type ChartBarGrid,
  type ChartBarPoint,
  type ChartTrendDirection,
  chartBarCardShell,
  chartBarColorHex,
  chartBarFrame,
  chartBarSeriesColor,
  chartBarSignedDomain,
  chartBarSignedLabelOverlay,
  chartBarTooltipRow,
  chartBarTrendFooter,
} from "./chart-bar-shared.js";

export interface ChartBarNegativeProps {
  data?: ChartBarPoint[];
  seriesLabel?: string;
  /** Theme role (resolved at shift-9) or literal ramp hex. */
  positiveColor?: string;
  /** Theme role (resolved at shift-9) or literal ramp hex. */
  negativeColor?: string;
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
function chartBarNegative(
  props: ChartBarNegativeProps = {},
): DomphyElement<"div"> {
  const {
    data = CHART_BAR_NEGATIVE_DATA,
    seriesLabel = "Visitors",
    // Upstream fills positive bars with var(--chart-1) and negative bars with
    // var(--chart-2) — two steps of the same monochrome blue ramp.
    positiveColor = chartBarSeriesColor(0).hex,
    negativeColor = chartBarSeriesColor(1).hex,
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
          overlays: [
            chartBarSignedLabelOverlay({
              categories,
              values,
              valueDomain,
              grid: GRID,
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

function chartBarNegativeTooltipFormatter(
  seriesLabel: string,
): (parametersInput: TooltipParams | TooltipParams[]) => string {
  return (parametersInput) => {
    const parameters = Array.isArray(parametersInput)
      ? parametersInput
      : [parametersInput];
    if (parameters.length === 0) return "";
    const value = escapeTooltipHtml(String(parameters[0].value ?? ""));
    // Upstream negative chart: <ChartTooltipContent hideLabel hideIndicator />
    // — no swatch, name muted, value mono medium foreground.
    return chartBarTooltipRow("", escapeTooltipHtml(seriesLabel), value);
  };
}

export { chartBarNegative };
