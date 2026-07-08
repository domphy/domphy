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
import { themeColorToken } from "@domphy/theme";
import {
  ACTIVITY_ENERGY_UNIT,
  ACTIVITY_SERIES_CONFIG,
  ACTIVITY_TOOLTIP_DATA,
  activityBarOption,
  activityTooltipCard,
  activityTooltipFormatter,
  activityTooltipPlot,
  formatWeekdayShort,
  type ActivityDayPoint,
  type ActivitySeriesEntry,
  type TooltipValueContext,
} from "./chart-tooltip-shared.js";

// Upstream renders the value cell as `font-mono font-medium text-foreground
// tabular-nums` with a `font-normal text-muted-foreground` unit suffix. The
// shared `monoUnitValueRenderer` dropped the value's medium weight and left
// the unit at foreground strength in the default proportional font, flattening
// upstream's emphasized-value / muted-unit contrast — so this recipe supplies
// its own value renderer instead of the shared one. The muted tone is derived
// from the same light-theme neutral scale the engine's own tooltip panel uses
// (`themeColorToken(null, …, "neutral")`, panel foreground = shift-10), so the
// unit reads as de-emphasized against the value without a raw opacity multiply
// (which measured a WCAG color-contrast failure in a prior pass).
const TOOLTIP_MUTED_COLOR = themeColorToken(null, "shift-8", "neutral");

// Upstream's `min-w-[130px]` sits on the whole tooltip row; reproduced here as
// the tooltip panel's minimum width.
const TOOLTIP_PANEL_MIN_WIDTH_PX = 130;

function mutedMonoUnitValueRenderer(unit: string): (context: TooltipValueContext) => string {
  const safeUnit = unit
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return (context) =>
    // Value: monospace + tabular + medium weight, inheriting the panel's full
    // foreground color (upstream `text-foreground`).
    `<span style="font-variant-numeric:tabular-nums;font-family:ui-monospace,monospace;font-weight:500;">${String(context.value)}</span>` +
    // Unit: same monospace family (inherited from the value div upstream),
    // normal weight, muted color (upstream `font-normal text-muted-foreground`).
    `<span style="margin-left:2px;font-family:ui-monospace,monospace;color:${TOOLTIP_MUTED_COLOR};">${safeUnit}</span>`;
}

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
    renderValue: mutedMonoUnitValueRenderer(unit),
    minRowWidthPx,
    panelMinWidthPx: TOOLTIP_PANEL_MIN_WIDTH_PX,
  });
  const option = activityBarOption({ data, categories, series, showCursor, formatter });

  return activityTooltipCard({
    title,
    description,
    plot: activityTooltipPlot({ option, categories, defaultOpenIndex }),
  });
}

export { chartTooltipFormatter };
