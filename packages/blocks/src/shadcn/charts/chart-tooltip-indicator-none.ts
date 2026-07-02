// shadcn/ui "charts/tooltip" (indicator-none recipe) — clean-room
// reimplementation.
//
// Keeps the default date header, but drops the leading color swatch
// entirely — rows read as just the series name followed by its value.
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

export interface ChartTooltipIndicatorNoneProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" indicator-none recipe — no leading swatch, just
 * series name + value. Call with no arguments for a working demo.
 */
function chartTooltipIndicatorNone(props: ChartTooltipIndicatorNoneProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    title = "Bar Chart - Tooltip Indicator None",
    description = "No color swatch, just series name and value",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, { indicator: "none" });
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipIndicatorNone };
