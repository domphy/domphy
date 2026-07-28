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

import type { ChartOption, TooltipParams } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";
import { type ThemeColor, themeColorToken } from "@domphy/theme";
import {
  BROWSER_CATEGORY_DATA,
  type CategoryPoint,
  chartCard,
  chartLineSeriesColor,
  chartPlot,
  computeYDomain,
  HIDDEN_AXIS_LINE_GRID,
  hiddenLabelYAxis,
  hiddenXAxis,
  staticPointMarkersOverlay,
  tooltipRow,
  trendFooter,
} from "./chart-line-shared.js";

const DOT_RADIUS = 5;

// Per-point marker colors are literal ramp hexes (see BROWSER_CATEGORY_DATA);
// a theme role falls back to a shift-9 resolution.
function pointColorHex(color: string): string {
  return color.startsWith("#") || color.startsWith("rgb")
    ? color
    : themeColorToken(null, "shift-9", color as ThemeColor);
}

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
function chartLineDotsColors(
  props: ChartLineDotsColorsProps = {},
): DomphyElement<"div"> {
  const {
    title = "Line Chart - Dots Colors",
    description = "Browser share for the last 6 months",
    seriesColor = "primary",
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
  function perPointSwatchTooltipFormatter(
    params: TooltipParams | TooltipParams[],
  ): string {
    const point = Array.isArray(params) ? params[0] : params;
    if (!point) return "";
    const pointColor = pointColorHex(
      data[point.dataIndex]?.color ?? seriesColor,
    );
    const swatch = `<span style="display:inline-block;width:3px;height:12px;border-radius:2px;background:${pointColor};"></span>`;
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
        // Upstream's uniform line stroke is var(--chart-2): the engine pins
        // strokes to shift-9, so the ramp step is approximated via opacity.
        lineStyle: {
          width: 2,
          opacity: chartLineSeriesColor(1).strokeOpacity,
        },
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
            const circle = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle",
            ) as SVGCircleElement;
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(DOT_RADIUS));
            circle.setAttribute(
              "fill",
              pointColorHex(data[index].color),
            );
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
