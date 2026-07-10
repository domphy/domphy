// shadcn/ui "charts/radar-radius" recipe — clean-room reimplementation.
//
// The two-series radar chart whose defining trait is a numeric radius-axis
// scale: evenly-stepped tick numbers (0..max) laid out along a fixed 60°
// direction from the chart center. Upstream's <PolarRadiusAxis angle={60}
// orientation="middle" axisLine={false}> renders exactly these tick labels and
// explicitly draws NO radial axis line, so this recipe draws no line either.
// The month-name perimeter labels are dropped (this recipe omits the angle axis
// entirely, matching the reference), leaving a bare perimeter. The hover
// tooltip shows the month name as a heading above both series' values.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor } from "@domphy/theme";
import { fixed } from "../../shared/typography.js";
import {
  type ChartTrendDirection,
  chartTrendFooter,
} from "./chart-area-shared.js";
import {
  createRadarTooltip,
  RADAR_MONTHLY_MULTI_DATA,
  RADAR_MULTI_SERIES,
  RADAR_PLOT_RADIUS,
  type RadarPoint,
  type RadarSeriesConfig,
  radarCardShell,
  radarPolarPoint,
  renderRadarChart,
} from "./chart-radar-shared.js";

export interface ChartRadarRadiusProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  radiusAxisAngle?: number;
}

// Upstream's <PolarRadiusAxis> renders numeric tick labels for the radial value
// scale, centered along the `angle` direction with the axis line disabled.
// Reproduce that scale as SVG <text> at nice, evenly-stepped values from 0 up to
// the data max, each placed at its true value-proportional radius along the 60°
// axis and colored with the axis stroke (var(--foreground) -> strongest
// foreground tone) exactly as recharts fills its radius ticks.
function renderRadiusAxisTicks(
  data: RadarPoint[],
  series: RadarSeriesConfig[],
  angleDeg: number,
): DomphyElement[] {
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) =>
      series.map((entry) => Number(point[entry.key]) || 0),
    ),
  );
  const rawStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceUnit =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceUnit * magnitude;

  const ticks: DomphyElement[] = [];
  for (let value = 0; value <= maxValue + 1e-9; value += step) {
    const rounded = Math.round(value);
    const point = radarPolarPoint(
      RADAR_PLOT_RADIUS * (rounded / maxValue),
      angleDeg,
    );
    ticks.push({
      text: String(rounded),
      x: point.x,
      y: point.y,
      fill: (l: Listener) => themeColor(l, "shift-11"),
      fontSize: fixed("10"),
      textAnchor: "middle",
      dominantBaseline: "middle",
      _key: `radius-tick-${rounded}`,
    } as DomphyElement<"text">);
  }
  return ticks;
}

/**
 * shadcn/ui "charts/radar-radius" recipe — the multi-series radar chart with a
 * numeric radius-axis scale (tick numbers along a 60° direction, no axis line).
 * Call with no arguments for a working demo.
 */
function chartRadarRadius(
  props: ChartRadarRadiusProps = {},
): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_MULTI_DATA,
    series = RADAR_MULTI_SERIES,
    title = "Radar Chart - Radius Axis",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
    radiusAxisAngle = 60,
  } = props;

  const tooltip = createRadarTooltip();

  const chart = renderRadarChart({
    data,
    series,
    tooltip,
    showAngleLabels: false,
    tooltipShowLabel: true,
    tooltipIndicator: "line",
  });

  // Inject the radius-axis numeric tick labels into the chart's own <svg>
  // viewBox. renderRadarChart exposes no "extra svg children" hook and the
  // shared helper is off-limits, so reach into its return shape: a legend-less
  // chart is `{ div: [svgElement, tooltipLayer], ... }`.
  // ponytail: coupled to that return order; the alternative is duplicating the
  // whole svg + tooltip assembly here just to add four <text> nodes.
  const svgElement = (chart.div as DomphyElement[])[0] as DomphyElement<"svg">;
  (svgElement.svg as DomphyElement[]).push(
    ...renderRadiusAxisTicks(data, series, radiusAxisAngle),
  );

  return radarCardShell({
    title,
    description,
    content: { div: [chart] },
    footer: chartTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
    }),
  });
}

export { chartRadarRadius };
