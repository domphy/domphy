// shadcn/ui "charts/radar-grid-circle" recipe — clean-room reimplementation.
//
// A single-series radar chart over a fully circular (ring) background grid
// while keeping the radial spoke lines, so the data polygon's straight
// hexagon silhouette contrasts against the round grid beneath it. Corner
// dots included by default. Minimal, value-only hover tooltip.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADAR_SINGLE_SERIES,
  RADAR_MONTHLY_SINGLE_DATA,
  createRadarTooltip,
  radarCardShell,
  renderRadarChart,
  type RadarPoint,
  type RadarSeriesConfig,
} from "./chart-radar-shared.js";

export interface ChartRadarGridCircleProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  showDots?: boolean;
}

/**
 * shadcn/ui "charts/radar-grid-circle" recipe — a single-series radar chart
 * over a circular grid with spokes kept. Call with no arguments for a
 * working demo.
 */
function chartRadarGridCircle(props: ChartRadarGridCircleProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Grid Circle",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    showDots = true,
  } = props;

  const tooltip = createRadarTooltip();

  return radarCardShell({
    title,
    description,
    content: {
      div: [
        renderRadarChart({
          data,
          series,
          tooltip,
          gridShape: "circle",
          gridShowSpokes: true,
          showDots,
          tooltipShowLabel: false,
          tooltipIndicator: "none",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarGridCircle };
