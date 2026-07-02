// shadcn/ui "chart-area" (interactive recipe) — clean-room reimplementation.
//
// A taller card whose header carries a compact range <select> beside the
// title/description, and whose body reuses the gradient-fill treatment over
// a long daily dataset. Selecting a different trailing-window preset
// (7/30/90 days) filters the dataset down to that slice, ending at the
// dataset's fixed latest date, and re-renders the chart.
//
// Per the spec's research note this recipe appears to omit the trend-
// sentence footer used by the other recipes, relying on the header
// description instead — no footer is rendered here.
//
// FIDELITY NOTE: the mount-time "draw in" reveal is a clip-path wipe (see
// chart-area-shared.ts's note on chartAreaFrame) rather than a true per-path
// animation; on a range change this recipe manually replays that same wipe
// via the Web Animations API against the chart frame's DOM node, since
// @domphy/ui's motion() only plays its enter animation once, on mount.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeSpacing, type ThemeColor } from "@domphy/theme";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";
import { motion, select } from "@domphy/ui";
import {
  CHART_AREA_DAILY_DATA,
  CHART_AREA_RANGE_PRESETS,
  CHART_AREA_REVEAL_TRANSITION,
  CHART_AREA_SERIES_PALETTE,
  CHART_AREA_X_AXIS_BARE,
  CHART_AREA_Y_AXIS_HIDDEN,
  chartAreaGradientFill,
  chartAxisTooltipFormatter,
  chartCardShell,
  formatShortMonthDay,
  type ChartAreaDailyPoint,
  type ChartRangePreset,
} from "./chart-area-shared.js";

export interface ChartAreaInteractiveSeries {
  key: "desktop" | "mobile";
  label: string;
  color: ThemeColor;
}

export interface ChartAreaInteractiveProps {
  data?: ChartAreaDailyPoint[];
  series?: ChartAreaInteractiveSeries[];
  rangePresets?: ChartRangePreset[];
  defaultRangeDays?: number;
  title?: string;
  description?: string;
  height?: number;
}

const DEFAULT_SERIES: ChartAreaInteractiveSeries[] = [
  { key: "desktop", label: "Desktop", color: CHART_AREA_SERIES_PALETTE[0] },
  { key: "mobile", label: "Mobile", color: CHART_AREA_SERIES_PALETTE[1] },
];

/**
 * shadcn/ui "chart-area" interactive recipe — a taller gradient-fill area
 * chart over a long daily range, with a trailing-window range select in the
 * header. Call with no arguments for a working demo.
 */
function chartAreaInteractive(props: ChartAreaInteractiveProps = {}): DomphyElement<"div"> {
  const {
    data = CHART_AREA_DAILY_DATA,
    series = DEFAULT_SERIES,
    rangePresets = CHART_AREA_RANGE_PRESETS,
    defaultRangeDays = 90,
    title = "Area Chart - Interactive",
    description = "Total visitors for the selected date range",
    height = 100,
  } = props;

  let chartFrameElement: HTMLElement | null = null;

  function buildOption(days: number): ChartOption {
    const sliced = data.slice(-days);
    const rawDates = sliced.map((point) => point.date);
    const tooltipCategories = rawDates.map(formatShortMonthDay);
    return {
      tooltip: {
        trigger: "axis",
        formatter: chartAxisTooltipFormatter(tooltipCategories),
      },
      xAxis: {
        ...CHART_AREA_X_AXIS_BARE,
        data: rawDates,
        axisLabel: { formatter: (value: unknown) => formatShortMonthDay(String(value)) },
      },
      yAxis: CHART_AREA_Y_AXIS_HIDDEN,
      grid: { left: 8, right: 8, top: 12, bottom: 24, containLabel: false },
      series: series.map((s) => ({
        type: "line",
        name: s.label,
        smooth: true,
        showSymbol: false,
        color: s.color,
        lineStyle: { width: 2 },
        areaStyle: { color: chartAreaGradientFill(s.color), opacity: 1 },
        data: sliced.map((point) => point[s.key]),
      })),
    };
  }

  const optionState = toState(buildOption(defaultRangeDays));

  function replayReveal(): void {
    if (!chartFrameElement || typeof chartFrameElement.animate !== "function") return;
    chartFrameElement.animate(
      [{ clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }],
      { ...CHART_AREA_REVEAL_TRANSITION, fill: "both" },
    );
  }

  const chartFrame: DomphyElement<"div"> = {
    div: null,
    style: { width: "100%", height: themeSpacing(height) },
    $: [
      chart(optionState),
      motion({
        initial: { clipPath: "inset(0% 100% 0% 0%)" },
        animate: { clipPath: "inset(0% 0% 0% 0%)" },
        transition: CHART_AREA_REVEAL_TRANSITION,
      }),
    ],
    _onMount: (node) => {
      chartFrameElement = node.domElement as HTMLElement;
    },
  };

  const rangeAside: DomphyElement<"aside"> = {
    aside: [
      {
        select: rangePresets.map((preset) => ({
          option: preset.label,
          value: String(preset.days),
          _key: preset.days,
        })),
        value: String(defaultRangeDays),
        "aria-label": "Select date range",
        onChange: (event: Event) => {
          const days = Number((event.target as HTMLSelectElement).value);
          optionState.set(buildOption(days));
          replayReveal();
        },
        $: [select()],
      } as DomphyElement<"select">,
    ],
    style: {
      // The range control collapses on narrow viewports, per spec.
      "@media (max-width: 36em)": { display: "none" },
    },
  };

  return chartCardShell({
    title,
    description,
    headerAside: rangeAside,
    content: { div: [chartFrame] },
  });
}

export { chartAreaInteractive };
