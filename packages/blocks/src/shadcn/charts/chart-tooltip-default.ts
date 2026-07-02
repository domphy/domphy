// shadcn/ui "charts/tooltip" (default recipe) — clean-room reimplementation.
//
// Baseline stacked-bar chart tooltip: a bordered/rounded/shadowed panel with
// a bold date header and one color-dot + series-name + value row per series.
// No hover-highlight cursor rectangle; the tooltip panel is the only hover
// feedback. Pinned open on the second column by default, matching the live
// documentation preview described in the block's spec.
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

export interface ChartTooltipDefaultProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" default recipe — hover-driven tooltip with a
 * bold date header and a color-dot row per series. Call with no arguments
 * for a working demo.
 */
function chartTooltipDefault(props: ChartTooltipDefaultProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    title = "Bar Chart - Tooltip",
    description = "Running vs swimming activity, Jul 15 - Jul 20",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series);
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipDefault };
