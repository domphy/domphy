// shadcn/ui "charts/pie-label" — clean-room reimplementation.
//
// The simple pie chart plus outside labels: a thin leader line from each
// wedge's outer edge to its numeric value (matching a default Recharts pie
// `label`, which prints the dataKey value — not the category name). The
// hover tooltip still carries the category name. Implemented purely from the
// block's public functional/visual spec — no upstream source was viewed.

import type { DomphyElement } from "@domphy/core";
import { motion } from "@domphy/ui";
import {
  createPieTooltipState,
  DEFAULT_PIE_DATA,
  defaultValueFormatter,
  layoutPieSlices,
  PIE_OUTER_RADIUS,
  type PieDatum,
  pieCard,
  pieCardDescription,
  pieCardFooter,
  pieCardTitle,
  pieChartContainer,
  pieOutsideLabel,
  pieWedgePath,
} from "./pie-chart-shared.js";

export interface ChartPieLabelProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
  /** Toggle the leader lines connecting each wedge to its label. Defaults to true. */
  leaderLine?: boolean;
  /** Slices smaller than this fraction of the total are left unlabeled to avoid crowding. */
  minLabelFraction?: number;
}

/**
 * A pie chart annotated with outward category-name labels connected by thin
 * leader lines. Call with no arguments for a fully working demo.
 */
function chartPieLabel(props: ChartPieLabelProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Label",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    leaderLine = true,
    minLabelFraction = 0.03,
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedgeNodes: DomphyElement[] = slices.flatMap((slice) => [
    pieWedgePath(slice, {
      outerRadius: PIE_OUTER_RADIUS,
      // The value is already printed as the on-chart label — the tooltip
      // carries the category name (matching upstream's `hideLabel` tooltip,
      // which still shows the resolved name + value row).
      tooltip: { containerRef, tooltipState, valueFormatter },
    }),
    ...pieOutsideLabel(slice, {
      text: valueFormatter(slice.datum.value),
      leaderLine,
      minFraction: minLabelFraction,
    }),
  ]);

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

export { chartPieLabel };
