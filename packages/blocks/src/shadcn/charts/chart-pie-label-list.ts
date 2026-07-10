// shadcn/ui "charts/pie-label-list" — clean-room reimplementation.
//
// A pie chart that labels every wedge with a friendly display name (sourced
// from a name lookup table rather than the raw data key) printed directly on
// each wedge's own fill in a small, compact, background-contrasting font — no
// leader lines, no separate legend block. Implemented purely from the block's
// public functional/visual spec — no upstream source was viewed.

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor } from "@domphy/theme";
import { motion } from "@domphy/ui";
import {
  createPieTooltipState,
  DEFAULT_PIE_DATA,
  defaultValueFormatter,
  layoutPieSlices,
  PIE_OUTER_RADIUS,
  type PieDatum,
  type PieSlice,
  pieCard,
  pieCardDescription,
  pieCardFooter,
  pieCardTitle,
  pieChartContainer,
  pieWedgePath,
  polarPoint,
} from "./pie-chart-shared.js";

// On-wedge display-name label: sits at each wedge's own mid-radius/bisector
// (not past the outer rim) with a fixed light fill so it reads against any
// slice color, matching the "printed on the fill" spec this block calls for.
// Upstream's <LabelList> labels every sector regardless of size, so there is
// no minimum-fraction cutoff here.
function pieWedgeNameLabel(
  slice: PieSlice,
  text: string,
  fontSize: string,
): DomphyElement<"text"> {
  const [x, y] = polarPoint(PIE_OUTER_RADIUS * 0.62, slice.midAngle);
  return {
    text,
    x: String(x),
    y: String(y),
    fill: (l: Listener) => themeColor(l, "shift-0", "neutral"),
    fontSize,
    textAnchor: "middle",
    dominantBaseline: "middle",
    _key: `${slice.datum.key}-name-label`,
  };
}

// Default lookup mapping raw data keys ("chrome") to a readable display name
// ("Chrome") — deliberately kept separate from `PieDatum.name` to demonstrate
// the "lookup, not raw key" sourcing the spec calls for.
const DEFAULT_DISPLAY_NAME_LOOKUP: Record<string, string> = {
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  edge: "Edge",
  other: "Other",
};

export interface ChartPieLabelListProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
  /** Metric label shown in every wedge's tooltip (upstream `chartConfig.visitors.label`). */
  metricLabel?: string;
  /** Maps each category's raw `key` to the readable text printed on the chart. */
  displayNameLookup?: Record<string, string>;
  /** SVG font-size (viewBox units) for the on-chart labels. */
  labelFontSize?: string;
}

/**
 * A pie chart labeling every wedge with a compact display name resolved from
 * a lookup table. Call with no arguments for a fully working demo.
 */
function chartPieLabelList(
  props: ChartPieLabelListProps = {},
): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Label List",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    metricLabel = "Visitors",
    displayNameLookup = DEFAULT_DISPLAY_NAME_LOOKUP,
    labelFontSize = "9",
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedgeNodes: DomphyElement[] = slices.flatMap((slice) => {
    const displayName = displayNameLookup[slice.datum.key] ?? slice.datum.name;
    // Upstream's tooltip uses nameKey="visitors" + hideLabel, so every row
    // reads "<metricLabel> <value>" (e.g. "Visitors 275") — the metric label,
    // not the browser category (already printed on the wedge). The shared
    // handler takes the tooltip name from the slice's datum name, so pass it a
    // slice carrying the metric label; geometry ignores the name.
    return [
      pieWedgePath(
        { ...slice, datum: { ...slice.datum, name: metricLabel } },
        {
          outerRadius: PIE_OUTER_RADIUS,
          tooltip: { containerRef, tooltipState, valueFormatter },
        },
      ),
      pieWedgeNameLabel(slice, displayName, labelFontSize),
    ];
  });

  return pieCard([
    pieCardTitle(title),
    pieCardDescription(description),
    pieChartContainer(
      containerRef,
      [
        {
          g: wedgeNodes,
          style: { transformOrigin: "100px 100px" },
          $: [
            motion({
              initial: { opacity: 0, scale: 0.7 },
              animate: { opacity: 1, scale: 1 },
              transition: { duration: 700, easing: "ease-out" },
            }),
          ],
        } as DomphyElement<"g">,
      ],
      tooltipState,
      `${title}: ${description}`,
    ),
    pieCardFooter({ trendValue, trendDirection, caption }),
  ]);
}

export { chartPieLabelList };
