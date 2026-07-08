// shadcn/ui "charts/tooltip" (icons recipe) — clean-room reimplementation.
//
// Hides the date header and replaces the usual color-dot indicator with a
// small line-icon glyph per series (a footprint-style icon for running, a
// wave-style icon for swimming), rendered in a neutral muted tone — upstream
// renders the icon bare so it inherits the row's `text-muted-foreground`.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied. Icon artwork (footprint /
// wave glyphs) is original, drawn directly as inline SVG markup.

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

export interface ChartTooltipIconsProps {
  data?: ActivityDayPoint[];
  series?: ActivitySeriesEntry[];
  showCursor?: boolean;
  defaultOpenIndex?: number | null;
  title?: string;
  description?: string;
}

/**
 * shadcn/ui "charts/tooltip" icons recipe — per-series icon glyph instead of
 * a color dot, no date header. Call with no arguments for a working demo.
 */
function chartTooltipIcons(props: ChartTooltipIconsProps = {}): DomphyElement<"div"> {
  const {
    data = ACTIVITY_TOOLTIP_DATA,
    series = ACTIVITY_SERIES_CONFIG,
    showCursor = false,
    defaultOpenIndex = 1,
    title = "Bar Chart - Tooltip Icons",
    description = "Series represented by icon glyphs instead of dots",
  } = props;

  const categories = data.map((point) => formatWeekdayShort(point.date));
  const formatter = activityTooltipFormatter(data, series, {
    indicator: "icon",
    showLabel: false,
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

export { chartTooltipIcons };
