// shadcn/ui "chart-area" (step recipe) — clean-room reimplementation.
//
// A single-series area chart whose outline/fill follows right-angle
// staircase steps between data points — each point sits mid-tread and the
// vertical jump is centered at the midpoint between adjacent x-values
// (recharts `type="step"` / d3 curveStep) — instead of a smooth or straight
// interpolation.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { ThemeColor } from "@domphy/theme";
import {
  CHART_AREA_MONTHLY_DATA,
  CHART_AREA_X_AXIS_BARE,
  CHART_AREA_Y_AXIS_HIDDEN,
  chartAreaFrame,
  chartAreaTooltipRow,
  chartCardShell,
  chartTrendFooter,
  chartTrendIcon,
  wrapChartAreaTooltip,
  type ChartAreaSinglePoint,
  type ChartTrendDirection,
} from "./chart-area-shared.js";

// Upstream's chartConfig assigns this series `icon: Activity`, and shadcn's
// ChartTooltipContent draws that config icon in place of the color-indicator
// dot on hover — even under `hideLabel`. The shared axis-tooltip formatter
// always emits a colored dot, so this recipe supplies its own formatter that
// swaps the dot for a small muted "activity" pulse glyph (an original
// clean-room waveform on a 24x24 grid, not lucide's exact path).
const ACTIVITY_TOOLTIP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
  ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
  ' style="display:inline-block;width:10px;height:10px;margin-right:6px;opacity:0.6;vertical-align:middle;">' +
  '<polyline points="2,12 7,12 10,5 14,19 17,12 22,12"></polyline></svg>';

function escapeTooltipText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Axis-trigger tooltip: no category header (upstream `hideLabel`), one
// activity-icon + muted series-name (left) + mono value (right) row per
// series. Value is the bare number — upstream uses no value formatter here.
function stepTooltipFormatter(paramsInput: TooltipParams | TooltipParams[]): string {
  const params = Array.isArray(paramsInput) ? paramsInput : [paramsInput];
  if (params.length === 0) return "";
  const rows = params
    .map((p) => {
      const label = escapeTooltipText(String(p.seriesName ?? p.name ?? ""));
      return chartAreaTooltipRow(ACTIVITY_TOOLTIP_ICON, label, escapeTooltipText(String(p.value ?? "")));
    })
    .join("");
  return wrapChartAreaTooltip(rows);
}

export interface ChartAreaStepProps {
  data?: ChartAreaSinglePoint[];
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  /** Icon shown on the series in the footer instead of a plain trend arrow — demonstrates attaching an icon to the series definition. */
  seriesIcon?: ChartTrendDirection;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  height?: number;
}

/**
 * shadcn/ui "chart-area" step recipe — a single-series staircase area
 * chart. Call with no arguments for a working demo.
 */
function chartAreaStep(props: ChartAreaStepProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_AREA_MONTHLY_DATA,
    seriesLabel = "Visitors",
    seriesColor = "primary",
    seriesIcon,
    title = "Area Chart - Step",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = `${data[0]?.month ?? ""} - ${data[data.length - 1]?.month ?? ""} 2026`,
    height = 64,
  } = props;

  const categories = data.map((point) => point.month);

  const option: ChartOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: stepTooltipFormatter,
    },
    xAxis: { ...CHART_AREA_X_AXIS_BARE, data: categories },
    yAxis: CHART_AREA_Y_AXIS_HIDDEN,
    // Upstream `<AreaChart margin={{ left: 12, right: 12 }}>`.
    grid: { left: 12, right: 12, top: 12, bottom: 24, containLabel: false },
    series: [
      {
        type: "line",
        name: seriesLabel,
        // recharts `<Area type="step">` maps to d3 curveStep: the vertical jump
        // is centered at the midpoint between adjacent months (data points sit
        // mid-tread), NOT held flat until the next x. Domphy's engine renders
        // `step: "middle"` as that same centered staircase.
        step: "middle",
        showSymbol: false,
        color: seriesColor,
        // recharts <Area> default stroke is ~1px.
        lineStyle: { width: 1 },
        areaStyle: { opacity: 0.4 },
        data: data.map((point) => point.value),
      },
    ],
  };

  return chartCardShell({
    title,
    description,
    content: { div: [chartAreaFrame(option, height)] },
    footer: chartTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
      trendIconOverride: seriesIcon ? chartTrendIcon(seriesIcon) : undefined,
    }),
  });
}

export { chartAreaStep };
