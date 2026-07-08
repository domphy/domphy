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
import type { ChartOption, TooltipParams } from "@domphy/chart";
import {
  BROWSER_CATEGORY_DATA,
  type CategoryPoint,
  HIDDEN_AXIS_LINE_GRID,
  chartCard,
  chartPlot,
  computeYDomain,
  hiddenLabelYAxis,
  hiddenXAxis,
  hoverDotOverlay,
  staticPointMarkersOverlay,
  tooltipRow,
  trendFooter,
} from "./chart-line-shared.js";

const REST_DOT_RADIUS = 5;
// Upstream activeDot={{ r: 6 }} — the hover dot is 6px, not larger.
const ACTIVE_DOT_RADIUS = 6;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  // Upstream ChartTooltipContent (indicator="line", nameKey="visitors",
  // hideLabel) colors the swatch with item.payload.fill — the HOVERED point's
  // own per-browser fill (chart.tsx L205) — and renders the metric label
  // beside the value (chart.tsx L251-253). The engine's TooltipParams.color is
  // the uniform series color, so resolve the point's own color by dataIndex
  // here (matching renderMarker below), and keep the series name in the line.
  function perPointSwatchTooltipFormatter(params: TooltipParams | TooltipParams[]): string {
    const point = Array.isArray(params) ? params[0] : params;
    if (!point) return "";
    const pointColor = data[point.dataIndex]?.color ?? seriesColor;
    const swatch = `<span style="display:inline-block;width:3px;height:12px;border-radius:2px;background:${themeColorToken(null, "shift-9", pointColor)};"></span>`;
    const label = escapeHtml(String(point.seriesName ?? point.name ?? ""));
    return tooltipRow(swatch, label, escapeHtml(String(point.value ?? "")));
  }

  const option: ChartOption = {
    grid: HIDDEN_AXIS_LINE_GRID,
    xAxis: hiddenXAxis(categories),
    yAxis: hiddenLabelYAxis(yDomain),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: perPointSwatchTooltipFormatter,
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
        // label shows the category's name, not its raw value. Upstream
        // <LabelList className="fill-foreground"> renders it at full card
        // foreground (not the engine's muted default point-label tone).
        label: {
          show: true,
          color: "neutral",
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
            circle.setAttribute("r", String(REST_DOT_RADIUS));
            circle.setAttribute("fill", dotFill);
            group.appendChild(circle);
          },
        }),
        hoverDotOverlay({
          categories,
          values,
          yDomain,
          grid: HIDDEN_AXIS_LINE_GRID,
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

export { chartLineLabelCustom };
