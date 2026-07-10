// shadcn/ui "chart-bar" (label recipe) — clean-room reimplementation.
//
// The same single-series monthly bar chart as the default recipe, but every
// bar prints its exact value as a text label just above its top edge — the
// y-axis is fully hidden since the labels take over that role, with only
// horizontal gridlines behind the bars.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption, LabelParams, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import { fixed } from "../../shared/typography.js";
import {
  CHART_BAR_MONTHLY_DATA,
  type ChartBarPoint,
  type ChartTrendDirection,
  chartBarCardShell,
  chartBarCategoryXAxis,
  chartBarFrame,
  chartBarTooltipRow,
  chartBarTrendFooter,
  chartBarValueDomain,
} from "./chart-bar-shared.js";

export interface ChartBarLabelProps {
  data?: ChartBarPoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  /** Formats each bar's printed value label. Defaults to the raw number. */
  labelFormatter?: (value: number) => string;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

/**
 * shadcn/ui "chart-bar" label recipe — every bar's value is printed above
 * it. Call with no arguments for a working demo.
 */
function chartBarLabel(props: ChartBarLabelProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_MONTHLY_DATA,
    seriesLabel = "Desktop",
    seriesColor = "primary",
    labelFormatter = (value) => String(value),
    title = "Bar Chart - Label",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    height = 64,
  } = props;

  const categories = data.map((point) => point.label);
  const values = data.map((point) => point.value);
  const [, domainMax] = chartBarValueDomain(values, 0.22);

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      // Upstream renders this recipe's tooltip with hideLabel — the month
      // name is dropped, only the series dot + name + value line shows.
      formatter: chartBarLabelTooltipFormatter,
    },
    xAxis: chartBarCategoryXAxis(categories),
    yAxis: {
      type: "value",
      min: 0,
      max: domainMax,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: true },
    },
    grid: { left: 8, right: 8, top: 24, bottom: 24 },
    series: [
      {
        type: "bar",
        name: seriesLabel,
        color: seriesColor,
        label: {
          show: true,
          position: "top",
          fontSize: fixed(12),
          formatter: (parameters: LabelParams) =>
            labelFormatter(Number(parameters.value) || 0),
        },
        data: values,
      },
    ],
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

function chartBarLabelTooltipFormatter(
  parametersInput: TooltipParams | TooltipParams[],
): string {
  const parameters = Array.isArray(parametersInput)
    ? parametersInput
    : [parametersInput];
  if (parameters.length === 0) return "";
  const item = parameters[0];
  // Upstream ChartTooltipContent's default 'dot' indicator is a 10px rounded
  // SQUARE (rounded-[2px], h-2.5 w-2.5), not a circle — see chart.tsx.
  const dot = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${item.color};margin-right:6px;"></span>`;
  const label = escapeTooltipHtml(String(item.seriesName ?? item.name ?? ""));
  const value = escapeTooltipHtml(String(item.value ?? ""));
  return chartBarTooltipRow(dot, label, value);
}

export { chartBarLabel };
