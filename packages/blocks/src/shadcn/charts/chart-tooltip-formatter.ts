// shadcn/ui "charts/tooltip" (formatter recipe) — clean-room reimplementation.
//
// Drops the date header AND the leading color indicator, replacing each row's
// content with a custom formatter: the series name followed by a
// monospace/tabular number and a small, lighter-colored unit abbreviation,
// with a minimum row width so the numbers line up as their digit count
// changes. Matches the upstream recipe, whose `hideLabel` + custom
// `formatter` (which renders no indicator swatch) produce the same
// header-less, swatch-less rows.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  ACTIVITY_ENERGY_UNIT,
  ACTIVITY_SERIES_CONFIG,
  ACTIVITY_TOOLTIP_DATA,
  activityBarOption,
  activityTooltipCard,
  activityTooltipFormatter,
  activityTooltipPlot,
  formatWeekdayShort,
  monoUnitValueRenderer,
  type ActivityDayPoint,
  type ActivitySeriesEntry,
} from "./chart-tooltip-shared.js";

export interface ChartTooltipFormatterProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  unit?: string;
  minRowWidthPx?: number;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" formatter recipe — mono/tabular value +
 * muted unit suffix per row, enforcing a minimum row width. Call with no
 * arguments for a working demo.
 */
function chartTooltipFormatter(props: ChartTooltipFormatterProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    unit = ACTIVITY_ENERGY_UNIT,
    minRowWidthPx = 56,
    title = "Bar Chart - Tooltip Formatter",
    description = "Custom value formatter with a minimum row width",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    indicator: "none",
    showLabel: false,
    renderValue: monoUnitValueRenderer(unit),
    minRowWidthPx,
  });
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipFormatter };
