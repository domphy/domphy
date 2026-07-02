// shadcn/ui "charts/pie-separator-none" — clean-room reimplementation.
//
// A pie/donut chart with zero border stroke and zero angular padding between
// adjacent wedges, so the colors blend into one seamless disc with no
// visible dividing lines. Functionally this is chartPieSimple with two
// prop flips (stroke width 0, pad angle 0), kept as an explicit variant so
// callers can see the "separator" knobs and re-enable them. Implemented
// purely from the block's public functional/visual spec — no upstream
// source was viewed.

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

export interface ChartPieSeparatorNoneProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
  /** Exposed for callers who want to re-enable dividers. Defaults to "0" (none). */
  strokeWidth?: string;
  /** Exposed for callers who want to re-enable dividers. Defaults to 0 (none). */
  padAngle?: number;
}

/**
 * A seamless pie chart with no stroke and no angular gap between wedges.
 * Call with no arguments for a fully working demo.
 */
function chartPieSeparatorNone(props: ChartPieSeparatorNoneProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - No Separator",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    strokeWidth = "0",
    padAngle = 0,
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedges: DomphyElement<"path">[] = slices.map((slice) =>
    pieWedgePath(slice, {
      outerRadius: PIE_OUTER_RADIUS,
      strokeWidth,
      padAngle,
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

export { chartPieSeparatorNone };
