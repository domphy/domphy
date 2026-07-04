// shadcn/ui "charts/pie-donut-text" — clean-room reimplementation.
//
// A donut chart whose hollow center displays the aggregate total of all
// categories as large bold text, with a smaller muted caption beneath it.
// The center total is static regardless of which wedge is hovered — it
// always reflects the full sum. Implemented purely from the block's public
// functional/visual spec — no upstream source was viewed.

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
  pieCenterText,
  pieChartContainer,
  pieWedgePath,
} from "./pie-chart-shared.js";

export interface ChartPieDonutTextProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
  innerRadius?: number;
  /** Computes the center total from the full dataset. Defaults to summing `value`. */
  totalGetter?: (data: PieDatum[]) => number;
  /** Muted caption word beneath the total, e.g. "Visitors". */
  centerCaption?: string;
}

/**
 * A donut chart whose hollow center shows the aggregate total plus a muted
 * caption. Call with no arguments for a fully working demo.
 */
function chartPieDonutText(props: ChartPieDonutTextProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Donut with Text",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    innerRadius = DEFAULT_DONUT_INNER_RADIUS,
    totalGetter = (records: PieDatum[]) => records.reduce((sum, record) => sum + record.value, 0),
    centerCaption = "Visitors",
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

  const total = totalGetter(data);

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
        pieCenterText(valueFormatter(total), centerCaption),
      ],
      tooltipState,
      `${title}: ${description}`,
    ),
    pieCardFooter({ trendValue, trendDirection, caption }),
  ]);
}

export { chartPieDonutText };
