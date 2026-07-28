// shadcn/ui "chart-area" (default recipe) — clean-room reimplementation.
//
// A single-series monthly area chart in a card: smoothly curved, softly
// filled region above small month-abbreviation x-axis labels (no axis lines,
// no y-axis), with a trend-sentence footer below a thin divider.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { ChartOption } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_AREA_MONTHLY_DATA,
  CHART_AREA_X_AXIS_BARE,
  CHART_AREA_Y_AXIS_HIDDEN,
  type ChartAreaSinglePoint,
  type ChartTrendDirection,
  chartAreaFrame,
  chartAreaGradientFill,
  chartAreaSeriesColor,
  chartAxisTooltipFormatter,
  chartCardShell,
  chartTrendFooter,
} from "./chart-area-shared.js";

export interface ChartAreaDefaultProps {
  data?: ChartAreaSinglePoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

/**
 * shadcn/ui "chart-area" default recipe — a single-series monthly area
 * chart with a trend footer. Call with no arguments for a working demo.
 */
function chartAreaDefault(
  props: ChartAreaDefaultProps = {},
): DomphyElement<"div"> {
  const {
    data = CHART_AREA_MONTHLY_DATA,
    seriesLabel = "Visitors",
    seriesColor = "primary",
    title = "Area Chart",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = `${data[0]?.month ?? ""} - ${data[data.length - 1]?.month ?? ""} 2026`,
    height = 64,
  } = props;

  const categories = data.map((point) => point.month);
  // Upstream colors this single series var(--chart-1) (≈ blue-300): the fill
  // uses the exact ramp tone, while the engine-pinned shift-9 stroke is faded
  // toward it with the ramp's stroke opacity.
  const ramp = chartAreaSeriesColor(0);

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      // Upstream passes `<ChartTooltipContent indicator="line" />` and no value
      // formatter, so the tooltip shows the bare number (no " visitors" unit).
      formatter: chartAxisTooltipFormatter(
        categories,
        undefined,
        false,
        "line",
      ),
    },
    xAxis: { ...CHART_AREA_X_AXIS_BARE, data: categories },
    yAxis: CHART_AREA_Y_AXIS_HIDDEN,
    // Bottom margin fits the full x-axis label row: the engine draws labels
    // 18px below the grid's bottom edge (11px hanging text), so 24px clipped
    // the glyphs at the frame edge.
    grid: { left: 8, right: 8, top: 12, bottom: 32, containLabel: false },
    series: [
      {
        type: "line",
        name: seriesLabel,
        smooth: true,
        showSymbol: false,
        color: seriesColor,
        // Upstream <Area> sets no strokeWidth, so the outline renders at the
        // 1px SVG default (unlike the linear recipe, which sets strokeWidth=2).
        // The engine defaults an unset lineStyle.width to 2, so pin it to 1.
        lineStyle: { width: 1, opacity: ramp.strokeOpacity },
        areaStyle: {
          color: chartAreaGradientFill("primary", 0.4, 0.4, ramp.tone),
          opacity: 1,
        },
        data: data.map((point) => point.value),
      },
    ],
  };

  return chartCardShell({
    title,
    description,
    content: { div: [chartAreaFrame(option, height)] },
    // Upstream's <TrendingUp/> has no color class — it inherits the neutral
    // foreground, not a green/red trend tint.
    footer: chartTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
      color: "neutral",
    }),
  });
}

export { chartAreaDefault };
