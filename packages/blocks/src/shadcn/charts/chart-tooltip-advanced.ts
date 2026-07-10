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
// engine, not a guess.
//
// VALUE/UNIT HIERARCHY: upstream renders the value with `font-mono
// font-medium` (weight 500) and the unit in `text-muted-foreground` at
// `font-normal` (weight 400), giving a clear value/unit hierarchy. The shared
// default renderer emits no unit suffix, so this recipe supplies its own
// `renderValue` (`advancedValueRenderer` below) — a per-recipe use of the
// formatter's designed `renderValue` hook.
//
// KNOWN RESIDUAL GAP (engine limitation, cannot be fixed here):
//   - Stacked-bar corners: upstream rounds only the outer corners 4px
//     ([0,0,4,4]/[4,4,0,0]) with a square seam; @domphy/chart's BarRenderer
//     hardcodes `barRadius = 2` on all four corners of every instance and
//     ignores series/itemStyle radius entirely.

import type { DomphyElement } from "@domphy/core";
import { themeColorToken } from "@domphy/theme";
import {
  ACTIVITY_ENERGY_UNIT,
  ACTIVITY_SERIES_CONFIG,
  ACTIVITY_TOOLTIP_DATA,
  type ActivityDayPoint,
  type ActivitySeriesEntry,
  activityBarOption,
  activityTooltipCard,
  activityTooltipFormatter,
  activityTooltipPlot,
  formatWeekdayShort,
  type TooltipValueContext,
} from "./chart-tooltip-shared.js";

/**
 * Value renderer matching upstream's value/unit hierarchy: a mono/tabular
 * value at font-medium (500) followed by the unit at font-normal (400) in a
 * muted foreground. `themeColorToken(null, "shift-9", "neutral")` (#707070) is
 * lighter than the engine tooltip's own text tone (shift-10) so it reads as
 * de-emphasized, yet still clears WCAG AA (~4.95:1) on the tooltip's light
 * background — unlike the reduced-opacity approach the shared renderer avoided.
 * The value is always numeric (safe to interpolate); the unit is a caller
 * prop, so its text is escaped before it reaches innerHTML.
 */
function advancedValueRenderer(
  unit: string,
): (context: TooltipValueContext) => string {
  const mutedColor = themeColorToken(null, "shift-9", "neutral");
  const safeUnit = unit
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return (context) =>
    `<span style="font-variant-numeric:tabular-nums;font-family:ui-monospace,monospace;font-weight:500;">${String(context.value)}</span>` +
    `<span style="margin-left:2px;font-weight:400;color:${mutedColor};">${safeUnit}</span>`;
}

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
function chartTooltipAdvanced(
  props: ChartTooltipAdvancedProps = {},
): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    unit = ACTIVITY_ENERGY_UNIT,
    panelMinWidthPx = 180,
    showTotal = true,
    totalLabel = "Total",
    title = "Bar Chart - Tooltip Advanced",
    description = "Custom rows plus a computed total per column",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    indicator: "square",
    showLabel: false,
    // Upstream's advanced custom formatter renders the series label bare in the
    // full foreground (not muted like the default/formatter recipes).
    mutedLabel: false,
    renderValue: advancedValueRenderer(unit),
    panelMinWidthPx,
    showTotal,
    totalLabel,
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

export { chartTooltipAdvanced };
