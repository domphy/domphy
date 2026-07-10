// shadcn/ui "charts/radar" (default recipe) — clean-room reimplementation.
//
// A card-framed single-series radar chart: six month spokes on a hexagonal
// polygon grid, one translucent accent-colored data shape connecting the
// six values. Hovering resolves the nearest spoke and shows a small
// swatch+label+value tooltip near the cursor.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  type ChartTrendDirection,
  chartTrendFooter,
} from "./chart-area-shared.js";
import {
  createRadarTooltip,
  RADAR_MONTHLY_SINGLE_DATA,
  RADAR_SINGLE_SERIES,
  type RadarPoint,
  type RadarSeriesConfig,
  radarCardShell,
  renderRadarChart,
} from "./chart-radar-shared.js";

export interface ChartRadarDefaultProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  fillOpacity?: number;
  showDots?: boolean;
}

/**
 * shadcn/ui "charts/radar" default recipe — a single-series hexagonal radar
 * chart with a trend footer. Call with no arguments for a working demo.
 */
function chartRadarDefault(
  props: ChartRadarDefaultProps = {},
): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
    fillOpacity,
    showDots = false,
  } = props;

  const resolvedSeries: RadarSeriesConfig[] =
    fillOpacity === undefined
      ? series
      : series.map((entry) => ({ ...entry, fillOpacity }));

  const tooltip = createRadarTooltip();

  return radarCardShell({
    title,
    description,
    content: {
      div: [
        renderRadarChart({
          data,
          series: resolvedSeries,
          tooltip,
          showDots,
          tooltipShowLabel: true,
          tooltipIndicator: "swatch",
        }),
      ],
    },
    footer: chartTrendFooter({
      trendText,
      direction: trendDirection,
      captionText,
    }),
  });
}

export { chartRadarDefault };
