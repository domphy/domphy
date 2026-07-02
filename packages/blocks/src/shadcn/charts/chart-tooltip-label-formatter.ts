// shadcn/ui "charts/tooltip" (label-formatter recipe) — clean-room
// reimplementation.
//
// The header re-formats the hovered column's raw date into a long,
// human-readable string ("July 15, 2024") while the x-axis itself keeps a
// short weekday tick label — two independent formatting functions over the
// same underlying date field, not one shared formatter.
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
  formatLongDate,
  formatWeekdayShort,
  type ActivityDayPoint,
  type ActivitySeriesEntry,
} from "./chart-tooltip-shared.js";

export interface ChartTooltipLabelFormatterProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  /** Formats the header's long-form date. Defaults to "July 15, 2024" style. */
  labelFormatter?: (isoDate: string) => string;
  /** Formats the x-axis tick labels. Defaults to the short weekday form. */
  xAxisLabelFormatter?: (isoDate: string) => string;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" label-formatter recipe — long-form date header
 * via a callback, independent from the x-axis's own short tick formatter.
 * Call with no arguments for a working demo.
 */
function chartTooltipLabelFormatter(props: ChartTooltipLabelFormatterProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    labelFormatter = formatLongDate,
    xAxisLabelFormatter = formatWeekdayShort,
    title = "Bar Chart - Tooltip Label Formatter",
    description = "Header reformats the raw date; axis ticks stay short",
  } = props;

  const categories = data.map((point) => xAxisLabelFormatter(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    labelMode: "custom",
    labelFormatter,
  });
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipLabelFormatter };
