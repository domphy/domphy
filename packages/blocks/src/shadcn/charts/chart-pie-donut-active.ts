// shadcn/ui "charts/pie-donut-active" — clean-room reimplementation.
//
// A donut chart where exactly one wedge is drawn permanently enlarged
// outward (extra outer radius + a slightly thicker stroke) as a static
// showcase of an "active slice" visual treatment — fixed by data
// index/build time, NOT driven by hover or click (that behavior belongs to
// chartPieInteractive). Implemented purely from the block's public
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
  pieChartContainer,
  pieWedgePath,
} from "./pie-chart-shared.js";

export interface ChartPieDonutActiveProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
  innerRadius?: number;
  /** Category `key` drawn enlarged. Defaults to the first record. */
  activeKey?: string;
  /** Extra outer-radius (viewBox units) the active wedge gets over the rest. */
  activeRadiusDelta?: number;
}

/**
 * A donut chart with one wedge statically drawn enlarged to demonstrate an
 * "active slice" treatment. Call with no arguments for a fully working demo.
 */
function chartPieDonutActive(props: ChartPieDonutActiveProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Donut Active",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    innerRadius = DEFAULT_DONUT_INNER_RADIUS,
    activeKey = data[0]?.key,
    activeRadiusDelta = 10,
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedges: DomphyElement<"path">[] = slices.map((slice) => {
    const isActive = slice.datum.key === activeKey;
    return pieWedgePath(slice, {
      innerRadius,
      outerRadius: isActive ? PIE_OUTER_RADIUS + activeRadiusDelta : PIE_OUTER_RADIUS,
      strokeWidth: isActive ? "2.5" : "1.5",
      tooltip: { containerRef, tooltipState, valueFormatter },
    });
  });

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
      `${title}: ${description}`,
    ),
    pieCardFooter({ trendValue, trendDirection, caption }),
  ]);
}

export { chartPieDonutActive };
