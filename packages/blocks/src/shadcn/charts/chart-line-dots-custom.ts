// shadcn/ui "charts/line-dots-custom" block — clean-room reimplementation.
//
// The default six-month smooth single-line chart with plain circular dots
// replaced by a "git commit" glyph at every data point: a hollow circle
// (outline = line color, fill = card background) with a short vertical tick
// above and below it, mirroring the upstream block's lucide GitCommitVertical
// marker.
//
// @domphy/chart's built-in line-symbol renderer only ever draws a plain
// circle (see ./chart-line-shared.ts), so the custom glyph is drawn by a
// companion SVG overlay positioned with the exact same public scale
// factories the engine itself uses.

import type { DomphyElement } from "@domphy/core";
import { type ThemeColor, themeColorToken } from "@domphy/theme";
import type { ChartOption } from "@domphy/chart";
import {
  DEFAULT_LINE_GRID,
  MONTHLY_VISITOR_DATA,
  type MonthlyPoint,
  bareValueTooltipFormatter,
  chartCard,
  chartPlot,
  computeYDomain,
  hiddenLabelYAxis,
  monthCategoryXAxis,
  staticPointMarkersOverlay,
  trendFooter,
} from "./chart-line-shared.js";

const MARKER_WIDTH = 8;
const MARKER_HEIGHT = 20;

/** Props for {@link chartLineDotsCustom}. */
export interface ChartLineDotsCustomProps {
  title?: string;
  description?: string;
  seriesLabel?: string;
  seriesColor?: ThemeColor;
  data?: MonthlyPoint[];
  markerWidth?: number;
  markerHeight?: number;
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-dots-custom" — the default single-line chart with a
 * custom hollow pin-glyph marker at every point instead of a plain circle.
 * Call with no arguments for a fully working demo.
 */
function chartLineDotsCustom(props: ChartLineDotsCustomProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Custom Dots",
    description = "January - June 2026",
    seriesLabel = "Desktop",
    seriesColor = "primary",
    data = MONTHLY_VISITOR_DATA,
    markerWidth = MARKER_WIDTH,
    markerHeight = MARKER_HEIGHT,
    trendHeadline = "Trending up by 5.2% this month",
    trendSubtitle = "Showing total visitors for the last 6 months",
    trendDirection = "up",
  } = props;

  const categories = data.map((point) => point.month);
  const values = data.map((point) => point.desktop);
  const yDomain = computeYDomain(values);
  const markerOutline = themeColorToken(null, "shift-9", seriesColor);
  const markerFill = themeColorToken(null, "shift-0", "neutral");

  const option: ChartOption = {
    grid: DEFAULT_LINE_GRID,
    xAxis: monthCategoryXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: bareValueTooltipFormatter,
    },
    series: [
      {
        type: "line",
        name: seriesLabel,
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        color: seriesColor,
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
          grid: DEFAULT_LINE_GRID,
          renderMarker({ cx, cy, group }) {
            const svgNamespace = "http://www.w3.org/2000/svg";
            const radius = markerWidth / 2;
            const halfHeight = markerHeight / 2;
            // Short vertical tick above and below the node (the git-commit look).
            for (const [y1, y2] of [
              [cy - halfHeight, cy - radius],
              [cy + radius, cy + halfHeight],
            ]) {
              const tick = document.createElementNS(svgNamespace, "line") as SVGLineElement;
              tick.setAttribute("x1", String(cx));
              tick.setAttribute("y1", String(y1));
              tick.setAttribute("x2", String(cx));
              tick.setAttribute("y2", String(y2));
              tick.setAttribute("stroke", markerOutline);
              tick.setAttribute("stroke-width", "2");
              tick.setAttribute("stroke-linecap", "round");
              group.appendChild(tick);
            }
            const node = document.createElementNS(svgNamespace, "circle") as SVGCircleElement;
            node.setAttribute("cx", String(cx));
            node.setAttribute("cy", String(cy));
            node.setAttribute("r", String(radius));
            node.setAttribute("fill", markerFill);
            node.setAttribute("stroke", markerOutline);
            node.setAttribute("stroke-width", "2");
            group.appendChild(node);
          },
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

export { chartLineDotsCustom };
