// shadcn/ui "charts/radar-grid-none" recipe — clean-room reimplementation.
//
// The most minimal radar recipe: no background grid at all — only the six
// month labels and a single translucent data polygon with corner dots
// floating in otherwise empty space. Minimal, value-only hover tooltip.
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

export interface ChartRadarGridNoneProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  showDots?: boolean;
  showGrid?: boolean;
}

/**
 * shadcn/ui "charts/radar-grid-none" recipe — a single-series radar chart
 * with no background grid. Call with no arguments for a working demo.
 */
function chartRadarGridNone(props: ChartRadarGridNoneProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Grid None",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    showDots = true,
    showGrid = false,
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
          gridShape: showGrid ? "polygon" : "none",
          showDots,
          tooltipShowLabel: false,
          tooltipIndicator: "none",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarGridNone };
