// shadcn/ui "charts/pie" (default recipe) — clean-room reimplementation.
//
// A minimal full pie chart inside a card: colored wedges with no on-slice
// labels or legend, a hover tooltip for detail, and a footer trend line.
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui or chart-library source was viewed or copied.

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
  pieWedgePath,
} from "./pie-chart-shared.js";

export interface ChartPieSimpleProps {
  /** Category records — falls back to a five-browser illustrative sample. */
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
}

/**
 * A card-framed full pie chart: colored wedges, hover tooltips, no on-slice
 * text. Call with no arguments for a fully working demo.
 */
function chartPieSimple(props: ChartPieSimpleProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedges: DomphyElement<"path">[] = slices.map((slice) =>
    pieWedgePath(slice, {
      outerRadius: PIE_OUTER_RADIUS,
      tooltip: { containerRef, tooltipState, valueFormatter },
    }),
  );

  return pieCard([
    pieCardTitle(title),
    pieCardDescription(description),
    pieChartContainer(
      containerRef,
      [
        {
          g: wedges,
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
    ),
    pieCardFooter({ trendValue, trendDirection, caption }),
  ]);
}

export { chartPieSimple };
