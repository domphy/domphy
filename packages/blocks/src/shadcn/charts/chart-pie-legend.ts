// shadcn/ui "charts/pie-legend" — clean-room reimplementation.
//
// A pie chart with no on-slice labels; instead a wrapped, multi-column
// legend of swatch+name pairs sits directly beneath the chart, pulled up so
// it visually hugs the circle instead of floating far below it. No footer
// trend line — the legend takes that slot. Implemented purely from the
// block's public functional/visual spec — no upstream source was viewed.

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
  pieCardTitle,
  pieChartContainer,
  pieLegendRow,
  pieWedgePath,
} from "./pie-chart-shared.js";

export interface ChartPieLegendProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  valueFormatter?: (value: number) => string;
  /** Number of equal-width legend columns. Defaults to 4. */
  legendColumns?: number;
}

/**
 * A pie chart with a wrapped swatch+name legend beneath it instead of
 * on-slice labels. Call with no arguments for a fully working demo.
 */
function chartPieLegend(props: ChartPieLegendProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Legend",
    description = "January - June 2024",
    valueFormatter = defaultValueFormatter,
    legendColumns = 4,
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
    {
      // The chart + legend live together as the card's single "content" grid
      // child; the legend itself is a plain child, not the footer.
      div: [
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
          `${title}: ${description}`,
        ),
        pieLegendRow(data, legendColumns),
      ],
    },
  ]);
}

export { chartPieLegend };
