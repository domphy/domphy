// shadcn/ui "charts/tooltip" (indicator-none recipe) — clean-room
// reimplementation.
//
// Header shows the raw x-axis category value (the ISO date) — upstream's
// ChartTooltipContent gets no labelFormatter — and the leading color swatch
// is dropped entirely, so rows read as just the series name followed by its
// monospace/tabular value.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  ACTIVITY_SERIES_CONFIG,
  ACTIVITY_TOOLTIP_DATA,
  type ActivityDayPoint,
  type ActivitySeriesEntry,
  activityBarOption,
  activityTooltipCard,
  activityTooltipFormatter,
  activityTooltipPlot,
  formatWeekdayShort,
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
function chartTooltipIndicatorNone(
  props: ChartTooltipIndicatorNoneProps = {},
): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    title = "Bar Chart - Tooltip Indicator None",
    description = "No color swatch, just series name and value",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    indicator: "none",
    // Upstream ChartTooltipContent receives no labelFormatter, so the header
    // shows the raw category value (the ISO date, e.g. "2024-07-16"), not a
    // reformatted one — an identity formatter reproduces that verbatim.
    labelMode: "custom",
    labelFormatter: (isoDate) => isoDate,
    // Value cell (mono/medium/tabular + toLocaleString) comes from the shared
    // default plainValueRenderer, which matches upstream ChartTooltipContent.
  });
  const option = activityBarOption({
    data,
    categories,
    series,
    showCursor,
    formatter,
  });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipIndicatorNone };
