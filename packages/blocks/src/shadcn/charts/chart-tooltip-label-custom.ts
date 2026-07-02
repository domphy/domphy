// shadcn/ui "charts/tooltip" (label-custom recipe) — clean-room
// reimplementation.
//
// The header text is driven by a fixed, config-level label (e.g.
// "Activities") instead of the hovered column's date, combined with the
// vertical line indicator style — demonstrating that the header can pull
// from a separate lookup key rather than always defaulting to the hovered
// data point's category value.
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

export interface ChartTooltipLabelCustomProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  groupLabel?: string;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" label-custom recipe — a fixed group label as
 * the header (not the hovered date) plus a line indicator per row. Call
 * with no arguments for a working demo.
 */
function chartTooltipLabelCustom(props: ChartTooltipLabelCustomProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    groupLabel = "Activities",
    title = "Bar Chart - Tooltip Label Custom",
    description = "Header pulls a static config label, not the hovered date",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    indicator: "line",
    labelMode: "static",
    staticLabel: groupLabel,
  });
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipLabelCustom };
