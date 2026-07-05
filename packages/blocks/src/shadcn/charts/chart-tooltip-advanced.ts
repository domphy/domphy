// shadcn/ui "charts/tooltip" (advanced recipe) — clean-room reimplementation.
//
// Enhanced tooltip: no default date header, a small square swatch per row, a
// monospace value with a muted unit suffix, and an extra bold "Total" row
// appended beneath a divider line — on every column — summing both series'
// values (matching the upstream recipe, whose formatter appends the total
// after its last series row on every hover).
//
// FIDELITY NOTE: the spec calls for "a fixed pixel width for the panel".
// @domphy/chart's tooltip container hardcodes its own box model
// (border/radius/shadow/background/max-width:260px) inside `createTooltip()`
// — `TooltipOption` has no width-override hook the engine actually reads
// (verified in chart-tooltip-shared.ts's header comment). This is
// approximated by wrapping the formatter's inner content in a
// `min-width`-styled div, which reserves the requested width visually but
// cannot force the outer panel wider than the engine's own hardcoded
// max-width — a real, source-verified constraint of the current chart
// engine, not a guess. Marked "partial" for that reason; everything else
// (no header, square swatch, mono+unit values, conditional total row) is a
// full port.
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

export interface ChartTooltipAdvancedProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  unit?: string;
  panelMinWidthPx?: number;
  showTotal?: boolean;
  totalLabel?: string;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" advanced recipe — square swatch, mono+unit
 * values, no header, and a computed grand-total row on every column. Call
 * with no arguments for a working demo.
 */
function chartTooltipAdvanced(props: ChartTooltipAdvancedProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    unit = ACTIVITY_ENERGY_UNIT,
    panelMinWidthPx = 220,
    showTotal = true,
    totalLabel = "Total",
    title = "Bar Chart - Tooltip Advanced",
    description = "Custom rows plus a computed total per column",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    indicator: "square",
    showLabel: false,
    renderValue: monoUnitValueRenderer(unit),
    panelMinWidthPx,
    showTotal,
    totalLabel,
  });
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipAdvanced };
