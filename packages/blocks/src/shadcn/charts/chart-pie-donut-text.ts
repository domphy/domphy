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
  createPieTooltipState,
  DONUT_SEPARATOR_STROKE_WIDTH,
  defaultValueFormatter,
  layoutPieSlices,
  PIE_OUTER_RADIUS,
  type PieDatum,
  pieCard,
  pieCardDescription,
  pieCardFooter,
  pieCardTitle,
  pieCenterText,
  pieChartContainer,
  pieWedgePath,
} from "./pie-chart-shared.js";

// This recipe's own illustrative dataset — deliberately distinct from the
// shared five-browser sample so the prominent center total reads 1,125
// (the value the upstream "donut with text" showcase displays). Callers pass
// their own `data` in real usage.
// Upstream (<Pie innerRadius={60}> against recharts' default outerRadius ~100px)
// renders a thin ring with a large center hole — an inner/outer ratio of ~0.60,
// not the shared 0.42 donut default. Pin this block's own ratio in viewBox units.
const DONUT_TEXT_INNER_RADIUS = PIE_OUTER_RADIUS * 0.6;

const DEFAULT_DONUT_TEXT_DATA: PieDatum[] = [
  { key: "chrome", name: "Chrome", value: 275 },
  { key: "safari", name: "Safari", value: 200 },
  { key: "firefox", name: "Firefox", value: 287 },
  { key: "edge", name: "Edge", value: 173 },
  { key: "other", name: "Other", value: 190 },
];

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
function chartPieDonutText(
  props: ChartPieDonutTextProps = {},
): DomphyElement<"div"> {
  const {
    data = DEFAULT_DONUT_TEXT_DATA,
    title = "Pie Chart - Donut with Text",
    description = "January - June 2024",
    trendValue = "5.2%",
    trendDirection = "up",
    caption = "Showing total visitors for the last 6 months",
    valueFormatter = defaultValueFormatter,
    innerRadius = DONUT_TEXT_INNER_RADIUS,
    totalGetter = (records: PieDatum[]) =>
      records.reduce((sum, record) => sum + record.value, 0),
    centerCaption = "Visitors",
  } = props;

  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const wedges: DomphyElement<"path">[] = slices.map((slice) =>
    pieWedgePath(slice, {
      innerRadius,
      outerRadius: PIE_OUTER_RADIUS,
      strokeWidth: DONUT_SEPARATOR_STROKE_WIDTH,
      padAngle: 0,
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
