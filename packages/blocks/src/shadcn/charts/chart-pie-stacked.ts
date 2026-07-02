// shadcn/ui "charts/pie-stacked" — clean-room reimplementation.
//
// Two concentric donut rings in one plot: a smaller inner ring for one
// metric and a larger outer ring for a second metric, both sharing the same
// category keys and the same color-per-category mapping (the inner ring's
// outer radius sits exactly at the outer ring's inner radius, so together
// they read as one continuous two-layer ring). Implemented purely from the
// block's public functional/visual spec — no upstream source was viewed.

import type { DomphyElement } from "@domphy/core";
import { motion } from "@domphy/ui";
import type { ThemeColor } from "@domphy/theme";
import {
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
  type PieDatum,
} from "./pie-chart-shared.js";

export interface PieStackedDatum {
  key: string;
  name: string;
  inner: number;
  outer: number;
  color?: ThemeColor;
}

// Illustrative sample data (two metrics per month) — not a required schema.
export const DEFAULT_STACKED_DATA: PieStackedDatum[] = [
  { key: "jan", name: "January", inner: 186, outer: 80 },
  { key: "feb", name: "February", inner: 305, outer: 200 },
  { key: "mar", name: "March", inner: 237, outer: 120 },
  { key: "apr", name: "April", inner: 173, outer: 190 },
  { key: "may", name: "May", inner: 209, outer: 130 },
  { key: "jun", name: "June", inner: 214, outer: 140 },
];

const INNER_RING_INNER_RADIUS = 30;
const INNER_RING_OUTER_RADIUS = 56;
// No gap: the outer ring's inner radius picks up exactly where the inner
// ring's outer radius ends, so the two rings read as one banded ring.
const OUTER_RING_INNER_RADIUS = INNER_RING_OUTER_RADIUS;
const OUTER_RING_OUTER_RADIUS = PIE_OUTER_RADIUS;

export interface ChartPieStackedProps {
  data?: PieStackedDatum[];
  title?: string;
  description?: string;
  trendValue?: string;
  trendDirection?: "up" | "down";
  caption?: string;
  valueFormatter?: (value: number) => string;
  innerSeriesLabel?: string;
  outerSeriesLabel?: string;
}

/**
 * Two concentric donut rings sharing one categorical color mapping, each
 * ring driven by its own metric. Call with no arguments for a fully working
 * demo.
 */
function chartPieStacked(props: ChartPieStackedProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_STACKED_DATA,
    title = "Pie Chart - Stacked",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    innerSeriesLabel = "Sessions",
    outerSeriesLabel = "Visitors",
  } = props;

  const toPieDatum = (metric: "inner" | "outer"): PieDatum[] =>
    data.map((record) => ({
      key: record.key,
      name: record.name,
      value: record[metric],
      color: record.color,
    }));

  const innerSlices = layoutPieSlices(toPieDatum("inner"));
  const outerSlices = layoutPieSlices(toPieDatum("outer"));
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const innerWedges: DomphyElement<"path">[] = innerSlices.map((slice) =>
    pieWedgePath(slice, {
      innerRadius: INNER_RING_INNER_RADIUS,
      outerRadius: INNER_RING_OUTER_RADIUS,
      keyPrefix: "inner-",
      tooltip: {
        containerRef,
        tooltipState,
        valueFormatter,
        markerShape: "line",
        seriesLabel: innerSeriesLabel,
      },
    }),
  );
  // Both rings resolve colors index-by-index (see resolveSliceColor in the
  // shared module), and `toPieDatum` preserves category order across both
  // arrays, so the two rings visibly agree per category without any extra
  // color-sharing plumbing here.
  const outerWedges: DomphyElement<"path">[] = outerSlices.map((slice) =>
    pieWedgePath(slice, {
      innerRadius: OUTER_RING_INNER_RADIUS,
      outerRadius: OUTER_RING_OUTER_RADIUS,
      keyPrefix: "outer-",
      tooltip: {
        containerRef,
        tooltipState,
        valueFormatter,
        markerShape: "line",
        seriesLabel: outerSeriesLabel,
      },
    }),
  );

  return pieCard([
    pieCardTitle(title),
    pieCardDescription(description),
    pieChartContainer(
      containerRef,
      [
        {
          g: [...innerWedges, ...outerWedges],
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

export { chartPieStacked };
