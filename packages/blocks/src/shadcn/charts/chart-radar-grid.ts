// shadcn/ui "charts/radar-grid" recipe — clean-room reimplementation.
//
// The base member of the grid-variant family: a single-series radar chart
// over a circular (ring) background grid with the radial spoke lines
// suppressed — a cleaner "radar screen" look — plus a solid dot marker at
// each data vertex. The hover tooltip is minimal: just the raw value for
// the nearest month, no month-name heading.
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

export interface ChartRadarGridProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  gridShape?: "polygon" | "circle";
  showSpokes?: boolean;
  showDots?: boolean;
}

/**
 * shadcn/ui "charts/radar-grid" recipe — a single-series radar chart over a
 * spoke-free circular grid. Call with no arguments for a working demo.
 */
function chartRadarGrid(props: ChartRadarGridProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Grid",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    gridShape = "circle",
    showSpokes = false,
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
          gridShape,
          gridShowSpokes: showSpokes,
          showDots,
          tooltipShowLabel: false,
          tooltipIndicator: "none",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarGrid };
