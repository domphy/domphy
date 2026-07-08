// shadcn/ui "charts/line-dots-colors" block — clean-room reimplementation.
//
// A single line plotted over five categorical (non-time) items where every
// point's dot is individually colored, while the line stroke itself stays
// one uniform accent color. The x-axis is fully hidden; only the horizontal
// gridlines remain as a backdrop.
//
// @domphy/chart's built-in line-symbol renderer draws one uniform dot color
// per series (ignoring any per-item color), so the colored dots are drawn by
// a companion SVG overlay instead (see ./chart-line-shared.ts) — positioned
// with the exact same public scale factories the engine itself uses.
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
  staticPointMarkersOverlay,
  tooltipRow,
  trendFooter,
} from "./chart-line-shared.js";

const DOT_RADIUS = 5;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Props for {@link chartLineDotsColors}. */
export interface ChartLineDotsColorsProps {
  title?: string;
  description?: string;
  seriesColor?: ThemeColor;
  data?: CategoryPoint[];
  trendHeadline?: string;
  trendSubtitle?: string;
  trendDirection?: "up" | "down";
}

/**
 * shadcn/ui "charts/line-dots-colors" — a categorical line chart with
 * individually colored per-point dots and a fully hidden x-axis. Call with
 * no arguments for a fully working demo.
 */
function chartLineDotsColors(props: ChartLineDotsColorsProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Dots Colors",
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

  // Upstream ChartTooltipContent (indicator="line") colors the swatch with
  // item.payload.fill — the HOVERED point's own per-browser fill — so it
  // matches that point's colored dot. The engine's TooltipParams.color is the
  // uniform series color instead, so resolve the point's own color by
  // dataIndex here, exactly as renderMarker below does.
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
          renderMarker({ index, cx, cy, group }) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle") as SVGCircleElement;
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(DOT_RADIUS));
            circle.setAttribute("fill", themeColorToken(null, "shift-9", data[index].color));
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

export { chartLineDotsColors };
