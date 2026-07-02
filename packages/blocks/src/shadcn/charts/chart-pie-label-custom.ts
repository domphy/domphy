// shadcn/ui "charts/pie-label-custom" — clean-room reimplementation.
//
// A pie chart whose slice label is a custom renderer: the raw numeric value,
// printed bold and high-contrast, centered at each wedge's own visual
// midpoint (mid-radius, angular bisector) instead of an outside leader-line
// label. Implemented purely from the block's public functional/visual spec —
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
  pieOnWedgeLabel,
  pieWedgePath,
} from "./pie-chart-shared.js";

export interface ChartPieLabelCustomProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  /** Formats the raw value printed on each wedge. Defaults to a plain number. */
  labelFormatter?: (value: number) => string;
  /** Fraction of the outer radius the label sits at (0 = center, 1 = rim). */
  labelRadiusFraction?: number;
}

/**
 * A pie chart with the raw numeric value printed directly on each wedge at
 * its angular bisector, computed from trigonometry rather than a default
 * outside-label anchor. Call with no arguments for a fully working demo.
 */
function chartPieLabelCustom(props: ChartPieLabelCustomProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Custom Label",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    labelFormatter = defaultValueFormatter,
    labelRadiusFraction = 0.62,
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedgeNodes: DomphyElement[] = slices.flatMap((slice) => {
    const label = pieOnWedgeLabel(slice, labelFormatter(slice.datum.value), {
      radiusFraction: labelRadiusFraction,
    });
    return [
      pieWedgePath(slice, {
        outerRadius: PIE_OUTER_RADIUS,
        // The value is already printed on the wedge — the tooltip only needs
        // to name the category.
        tooltip: {
          containerRef,
          tooltipState,
          valueFormatter: () => slice.datum.name,
          showName: false,
        },
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
    ),
    pieCardFooter({ trendValue, trendDirection, caption }),
  ]);
}

export { chartPieLabelCustom };
