// shadcn/ui "charts/tooltip" (indicator-line recipe) — clean-room
// reimplementation.
//
// Swaps the round color dot for a short vertical color bar/line indicator
// per series row. Upstream passes no labelFormatter, so the tooltip header
// shows the raw x-axis date string ("2024-07-16") — the axis tickFormatter's
// weekday label never reaches the tooltip — and every series value renders in
// a monospace / medium-weight / tabular-nums cell.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  ACTIVITY_SERIES_CONFIG,
  ACTIVITY_TOOLTIP_DATA,
  activityBarOption,
  activityTooltipCard,
  activityTooltipFormatter,
  activityTooltipPlot,
  formatWeekdayShort,
  type ActivityDayPoint,
  type ActivitySeriesEntry,
} from "./chart-tooltip-shared.js";

export interface ChartTooltipIndicatorLineProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" indicator-line recipe — a vertical color-bar
 * indicator instead of a round dot. Call with no arguments for a working
 * demo.
 */
function chartTooltipIndicatorLine(props: ChartTooltipIndicatorLineProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    title = "Bar Chart - Tooltip Indicator Line",
    description = "Vertical line indicator instead of a round dot",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    indicator: "line",
    // Upstream ChartTooltipContent receives no labelFormatter, so its header
    // is the raw x-axis category value (the ISO date). Identity formatter
    // reproduces that instead of the folder default's "Jul 16".
    labelMode: "custom",
    labelFormatter: (isoDate) => isoDate,
    // Value cell (mono/medium/tabular + toLocaleString) comes from the shared
    // default plainValueRenderer, which matches upstream ChartTooltipContent.
  });
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipIndicatorLine };
