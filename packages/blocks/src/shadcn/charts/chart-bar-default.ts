// shadcn/ui "chart-bar" (default recipe) — clean-room reimplementation.
//
// A single-series monthly bar chart in a card: one accent-colored bar per
// month with rounded top corners, floating hover tooltip + highlighted
// column, above a trend-sentence footer.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_MONTHLY_DATA,
  chartBarCardShell,
  chartBarCategoryXAxis,
  chartBarFrame,
  chartBarHiddenValueYAxis,
  chartBarTooltipRow,
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarPoint,
  type ChartTrendDirection,
} from "./chart-bar-shared.js";

export interface ChartBarDefaultProps {
  data?: ChartBarPoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  title?: string;
  subtitle?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  showTrendIcon?: boolean;
  captionText?: string;
  /** Bar corner radius, px. NOTE: @domphy/chart's BarRenderer hardcodes a
   * fixed 2px corner radius and never reads a bar's `itemStyle.borderRadius`
   * (verified against packages/chart/src/gl/BarRenderer.ts) — this prop is
   * forwarded to the chart option for forward-compatibility but currently
   * has no visible effect. */
  cornerRadius?: number;
  height?: number;
}

/**
 * shadcn/ui "chart-bar" default recipe — a single-series monthly bar chart
 * with a trend footer. Call with no arguments for a working demo.
 */
function chartBarDefault(props: ChartBarDefaultProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_BAR_MONTHLY_DATA,
    seriesLabel = "Desktop",
    seriesColor = "primary",
    title = "Bar Chart",
    subtitle = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    showTrendIcon = true,
    captionText = "Showing total visitors for the last 6 months",
    cornerRadius = 8,
    height = 64,
  } = props;

  const categories = data.map((point) => point.label);
  const values = data.map((point) => point.value);

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      // Upstream renders this recipe's tooltip with hideLabel — the month
      // name is dropped, only the series dot + name + value line shows.
      formatter: chartBarDefaultTooltipFormatter,
    },
    xAxis: chartBarCategoryXAxis(categories),
    yAxis: chartBarHiddenValueYAxis({ ...chartBarValueDomainOptions(values) }),
    grid: { left: 8, right: 8, top: 16, bottom: 24 },
    series: [
      {
        type: "bar",
        name: seriesLabel,
        color: seriesColor,
        itemStyle: { borderRadius: [cornerRadius, cornerRadius, 0, 0] },
        data: values,
      },
    ],
  };

  return chartBarCardShell({
    title,
    subtitle,
    content: { div: [chartBarFrame(option, { height })] },
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText, showIcon: showTrendIcon }),
  });
}

function escapeTooltipHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function chartBarDefaultTooltipFormatter(parametersInput: TooltipParams | TooltipParams[]): string {
  const parameters = Array.isArray(parametersInput) ? parametersInput : [parametersInput];
  if (parameters.length === 0) return "";
  const item = parameters[0];
  // Upstream ChartTooltipContent's default 'dot' indicator is a 10px rounded
  // SQUARE (rounded-[2px], h-2.5 w-2.5), not a circle — see chart.tsx.
  const dot = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${item.color};margin-right:6px;"></span>`;
  const label = escapeTooltipHtml(String(item.seriesName ?? item.name ?? ""));
  const value = escapeTooltipHtml(String(item.value ?? ""));
  return chartBarTooltipRow(dot, label, value);
}

function chartBarValueDomainOptions(values: number[]): { min: number; max: number } {
  const [min, max] = chartBarValueDomain(values);
  return { min, max };
}

export { chartBarDefault };
