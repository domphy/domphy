// shadcn/ui "charts/radar-dots" recipe — clean-room reimplementation.
//
// The same single-series hexagonal radar chart as chartRadarDefault, but
// with a solid, fully opaque marker dot drawn at every data vertex, so each
// point reads as an explicit "pin" poking through the translucent fill.
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

export interface ChartRadarDotsProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  dotRadius?: number;
  showDots?: boolean;
}

/**
 * shadcn/ui "charts/radar-dots" recipe — the default radar chart with a
 * solid dot marker at each vertex. Call with no arguments for a working demo.
 */
function chartRadarDots(props: ChartRadarDotsProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Dots",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
    dotRadius = 4,
    showDots = true,
  } = props;

  const tooltip = createRadarTooltip();

  return radarCardShell({
    title,
    description,
    // Upstream chart-radar-dots uses a plain `items-center` header (no pb-4).
    headerPaddingBottom: false,
    content: {
      div: [
        renderRadarChart({
          data,
          series,
          tooltip,
          showDots,
          dotRadius,
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

export { chartRadarDots };
