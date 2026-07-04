// shadcn/ui "charts/pie-label-list" — clean-room reimplementation.
//
// A pie chart that labels every wedge with a friendly display name (sourced
// from a name lookup table rather than the raw data key) in a small, compact
// font sitting just outside the wedge — no leader lines, no separate legend
// block. Implemented purely from the block's public functional/visual spec —
// no upstream source was viewed.

import type { DomphyElement } from "@domphy/core";
import { motion } from "@domphy/ui";
import {
  type PieDatum,
  DEFAULT_PIE_DATA,
  PIE_OUTER_RADIUS,
  createPieTooltipState,
  defaultValueFormatter,
  layoutPieSlices,
  pieCard,
  pieCardDescription,
  pieCardFooter,
  pieCardTitle,
  pieChartContainer,
  pieRimLabel,
  pieWedgePath,
} from "./pie-chart-shared.js";

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
  /** Maps each category's raw `key` to the readable text printed on the chart. */
  displayNameLookup?: Record<string, string>;
  /** SVG font-size (viewBox units) for the on-chart labels. */
  labelFontSize?: string;
}

/**
 * A pie chart labeling every wedge with a compact display name resolved from
 * a lookup table. Call with no arguments for a fully working demo.
 */
function chartPieLabelList(props: ChartPieLabelListProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Label List",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    displayNameLookup = DEFAULT_DISPLAY_NAME_LOOKUP,
    labelFontSize = "9",
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedgeNodes: DomphyElement[] = slices.flatMap((slice) => {
    const displayName = displayNameLookup[slice.datum.key] ?? slice.datum.name;
    const label = pieRimLabel(slice, displayName, { fontSize: labelFontSize });
    return [
      pieWedgePath(slice, {
        outerRadius: PIE_OUTER_RADIUS,
        tooltip: { containerRef, tooltipState, valueFormatter, showName: false },
      }),
      ...(label ? [label] : []),
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
