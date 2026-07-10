// shadcn/ui "charts/pie-label-custom" — clean-room reimplementation.
//
// A pie chart whose slice value is printed OUTSIDE the wedge at Recharts'
// default pie-label anchor: along each slice's mid-angle, just past the outer
// rim, textAnchor start/end by side, no leader line (upstream
// `labelLine={false}`). The value is drawn in the theme foreground text color
// so it reads against the card background, not the wedge fill. The hover
// tooltip row is relabeled to the metric ("Visitors", upstream
// `nameKey="visitors" hideLabel`) rather than the per-slice browser name.
// Implemented purely from the block's public functional/visual spec — no
// upstream source was viewed.

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
  wedgeTooltipHandlers,
} from "./pie-chart-shared.js";

export interface ChartPieLabelCustomProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  /** Formats the raw value printed just outside each wedge. Defaults to a plain number. */
  labelFormatter?: (value: number) => string;
  /** Metric label shown as the tooltip row name (upstream `nameKey="visitors"`). */
  valueLabel?: string;
}

/**
 * A pie chart with the raw numeric value printed just outside each wedge along
 * its mid-angle — the default Recharts pie-label anchor, no leader line — in
 * the theme foreground color. Call with no arguments for a fully working demo.
 */
function chartPieLabelCustom(
  props: ChartPieLabelCustomProps = {},
): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Custom Label",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    labelFormatter = defaultValueFormatter,
    valueLabel = "Visitors",
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedgeNodes: DomphyElement[] = slices.flatMap((slice) => [
    {
      ...pieWedgePath(slice, { outerRadius: PIE_OUTER_RADIUS }),
      // Upstream <ChartTooltipContent nameKey="visitors" hideLabel /> shows the
      // metric label ("Visitors") as the row name, not the browser name — feed
      // the shared tooltip a name-overridden datum so its name channel carries
      // the metric label instead of slice.datum.name.
      ...wedgeTooltipHandlers(
        { datum: { ...slice.datum, name: valueLabel }, color: slice.color },
        { containerRef, tooltipState, valueFormatter: labelFormatter },
      ),
    },
    // Value at the default outside anchor (mid-angle, just past the rim,
    // start/end anchored by side), no leader line, every slice labeled.
    ...pieOutsideLabel(slice, {
      text: labelFormatter(slice.datum.value),
      leaderLine: false,
      minFraction: 0,
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

export { chartPieLabelCustom };
