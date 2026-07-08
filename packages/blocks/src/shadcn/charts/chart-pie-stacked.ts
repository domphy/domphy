// shadcn/ui "charts/pie-stacked" — clean-room reimplementation.
//
// Two co-centered pie layers in one plot: a SOLID inner disc for one metric
// (full wedges from the center, no hollow hole) and a larger, detached outer
// ring for a second metric, separated by an empty radial gap so they read as
// a filled disc plus a floating band. Both layers share the same category
// keys and the same color-per-category mapping. Mirrors upstream's two
// <Pie> elements — inner `outerRadius={60}` (no innerRadius) and outer
// `innerRadius={70} outerRadius={90}`.

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
// Five months (January–May), matching upstream's desktop/mobile datasets.
export const DEFAULT_STACKED_DATA: PieStackedDatum[] = [
  { key: "january", name: "January", inner: 186, outer: 80 },
  { key: "february", name: "February", inner: 305, outer: 200 },
  { key: "march", name: "March", inner: 237, outer: 120 },
  { key: "april", name: "April", inner: 173, outer: 190 },
  { key: "may", name: "May", inner: 209, outer: 130 },
];

// Inner metric is a SOLID center disc (innerRadius 0). Radii are scaled to
// this family's shared PIE_OUTER_RADIUS (86): upstream's 60/70/90 map to
// ~57/67/86, preserving the ~10-unit empty gap that detaches the outer ring.
const INNER_DISC_OUTER_RADIUS = 57;
const OUTER_RING_INNER_RADIUS = 67;
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
 * A solid inner pie plus a larger detached outer ring, sharing one
 * categorical color mapping, each layer driven by its own metric. Call with
 * no arguments for a fully working demo.
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
    innerSeriesLabel = "Desktop",
    outerSeriesLabel = "Mobile",
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
      // Solid center disc — innerRadius defaults to 0, so no hollow hole.
      outerRadius: INNER_DISC_OUTER_RADIUS,
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
      `${title}: ${description}`,
    ),
    pieCardFooter({ trendValue, trendDirection, caption }),
  ]);
}

export { chartPieStacked };
