// shadcn/ui "charts/pie-donut" — clean-room reimplementation.
//
// The same category-share chart as chartPieSimple, rendered as a ring
// (donut) with a hollow center instead of a solid disc. No legend, no
// on-slice labels, no center text. Implemented purely from the block's
// public functional/visual spec — no upstream source was viewed.

import type { DomphyElement } from "@domphy/core";
import { motion } from "@domphy/ui";
import {
  type PieDatum,
  DEFAULT_DONUT_INNER_RADIUS,
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

export interface ChartPieDonutProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
  /** Ring thickness control: smaller = thicker ring, larger = thinner ring. */
  innerRadius?: number;
}

/**
 * A donut (ring) chart with hover tooltips, no on-slice text. Call with no
 * arguments for a fully working demo.
 */
function chartPieDonut(props: ChartPieDonutProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Donut",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    innerRadius = DEFAULT_DONUT_INNER_RADIUS,
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedges: DomphyElement<"path">[] = slices.map((slice) =>
    pieWedgePath(slice, {
      innerRadius,
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

export { chartPieDonut };
