// shadcn/ui "charts/line-label-custom" block — clean-room reimplementation.
//
// A categorical single line (uniform accent color, uniform-color dots) with
// an always-visible text label above every point showing that category's
// display name (looked up from the data, not the raw numeric value) instead
// of hiding the axis with no label at all. Unlike chartLineDotsColors, the
// dots here are one uniform accent color — the "custom" part is the label,
// not per-point dot colors.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { type ThemeColor, themeColorToken } from "@domphy/theme";
import type { ChartOption } from "@domphy/chart";
import {
  BROWSER_CATEGORY_DATA,
  type CategoryPoint,
  HIDDEN_AXIS_LINE_GRID,
  chartCard,
  chartPlot,
  computeYDomain,
  hiddenLabelYAxis,
  hiddenXAxis,
  lineSwatchValueTooltipFormatter,
  staticPointMarkersOverlay,
  trendFooter,
} from "./chart-line-shared.js";

const DOT_RADIUS = 5;

/** Props for {@link chartLineLabelCustom}. */
export interface ChartLineLabelCustomProps {
  title?: string;
  description?: string;
  seriesColor?: ThemeColor;
  data?: CategoryPoint[];
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-label-custom" — the categorical colored-dots chart
 * with an always-on display-name label above each point. Call with no
 * arguments for a fully working demo.
 */
function chartLineLabelCustom(props: ChartLineLabelCustomProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Custom Label",
    description = "Browser share for the last 6 months",
    seriesColor = "secondary",
    data = BROWSER_CATEGORY_DATA,
    trendHeadline = "Trending up by 4.8% this period",
    trendSubtitle = "Showing browser share across five platforms",
    trendDirection = "up",
  } = props;

  const categories = data.map((point) => point.key);
  const values = data.map((point) => point.value);
  const yDomain = computeYDomain(values);
  const dotFill = themeColorToken(null, "shift-9", seriesColor);

  const option: ChartOption = {
    grid: HIDDEN_AXIS_LINE_GRID,
    xAxis: hiddenXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: lineSwatchValueTooltipFormatter,
    },
    series: [
      {
        type: "line",
        name: "Share",
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        color: seriesColor,
        // Look up the friendly display name from `data` by dataIndex — the
        // label shows the category's name, not its raw value.
        label: {
          show: true,
          formatter: (params) => data[params.dataIndex]?.label ?? "",
        },
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
          grid: HIDDEN_AXIS_LINE_GRID,
          renderMarker({ cx, cy, group }) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle") as SVGCircleElement;
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(DOT_RADIUS));
            circle.setAttribute("fill", dotFill);
            group.appendChild(circle);
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

export { chartLineLabelCustom };
