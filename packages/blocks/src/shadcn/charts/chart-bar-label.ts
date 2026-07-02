// shadcn/ui "chart-bar" (label recipe) — clean-room reimplementation.
//
// The same single-series monthly bar chart as the default recipe, but every
// bar prints its exact value as a text label just above its top edge — the
// y-axis is fully hidden since the labels take over that role, and only
// vertical gridlines remain.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption, LabelParams } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_BAR_MONTHLY_DATA,
  chartBarAxisTooltipFormatter,
  chartBarCardShell,
  chartBarCategoryXAxis,
  chartBarFrame,
  chartBarTrendFooter,
  chartBarValueDomain,
  type ChartBarPoint,
  type ChartTrendDirection,
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
      formatter: chartBarAxisTooltipFormatter(categories),
    },
    xAxis: chartBarCategoryXAxis(categories, { splitLine: true }),
    yAxis: {
      type: "value",
      min: 0,
      max: domainMax,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
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
          formatter: (parameters: LabelParams) => labelFormatter(Number(parameters.value) || 0),
        },
        data: values,
      },
    ],
  };

  return chartBarCardShell({
    title,
    subtitle,
    content: { div: [chartBarFrame(option, { height })] },
    footer: chartBarTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartBarLabel };
