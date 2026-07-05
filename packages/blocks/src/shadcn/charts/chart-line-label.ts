// shadcn/ui "charts/line-label" block — clean-room reimplementation.
//
// The dotted single-line six-month chart (see chartLineDots) with a small
// always-on numeric label floating above every data point, plus extra top
// margin so the topmost label isn't clipped by the card edge.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { type ThemeColor, themeColorToken } from "@domphy/theme";
import type { ChartOption } from "@domphy/chart";
import {
  LABELED_LINE_GRID,
  MONTHLY_VISITOR_DATA,
  type MonthlyPoint,
  chartCard,
  chartPlot,
  computeYDomain,
  hiddenLabelYAxis,
  hoverDotOverlay,
  lineSwatchLabelValueTooltipFormatter,
  monthCategoryXAxis,
  staticPointMarkersOverlay,
  trendFooter,
} from "./chart-line-shared.js";

const REST_DOT_RADIUS = 4;
const ACTIVE_DOT_RADIUS = 8;

/** Props for {@link chartLineLabel}. */
export interface ChartLineLabelProps {
  title?: string;
  description?: string;
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  data?: MonthlyPoint[];
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-label" — the dotted single-line chart with an
 * always-visible numeric value label above every point. Call with no
 * arguments for a fully working demo.
 */
function chartLineLabel(props: ChartLineLabelProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Label",
    description = "January - June 2026",
    seriesLabel = "Desktop",
    seriesColor = "primary",
    data = MONTHLY_VISITOR_DATA,
    trendHeadline = "Trending up by 5.2% this month",
    trendSubtitle = "Showing total visitors for the last 6 months",
    trendDirection = "up",
  } = props;

  const categories = data.map((point) => point.month);
  const values = data.map((point) => point.desktop);
  const yDomain = computeYDomain(values);
  const dotFill = themeColorToken(null, "shift-9", seriesColor);

  const option: ChartOption = {
    grid: LABELED_LINE_GRID,
    xAxis: monthCategoryXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: lineSwatchLabelValueTooltipFormatter,
    },
    series: [
      {
        type: "line",
        name: seriesLabel,
        data: values,
        smooth: true,
        // Resting dots are drawn as solid filled circles by the overlay below
        // (upstream `dot={{ fill: color }}`); the engine's built-in line symbol
        // is a hollow white-fill circle, so it is disabled here.
        showSymbol: false,
        lineStyle: { width: 2 },
        color: seriesColor,
        label: { show: true },
      },
    ],
  };

  return chartCard({
    title,
    description,
    plot: chartPlot({
      option,
      overlays: [
        staticPointMarkersOverlay({
          categories,
          values,
          yDomain,
          grid: LABELED_LINE_GRID,
          renderMarker({ cx, cy, group }) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle") as SVGCircleElement;
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(REST_DOT_RADIUS));
            circle.setAttribute("fill", dotFill);
            group.appendChild(circle);
          },
        }),
        hoverDotOverlay({
          categories,
          values,
          yDomain,
          grid: LABELED_LINE_GRID,
          color: seriesColor,
          radius: ACTIVE_DOT_RADIUS,
        }),
      ],
    }),
    footer: trendFooter({
      headline: trendHeadline,
      subtitle: trendSubtitle,
      direction: trendDirection,
    }),
  });
}

export { chartLineLabel };
