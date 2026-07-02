// shadcn/ui "chart-radial-grid" recipe — clean-room reimplementation.
//
// The same five-ring radial bar chart as chartRadialSimple, but the solid
// per-ring background track is swapped for a small set of thin concentric
// polar gridlines drawn once behind every ring, and the rings sit at a
// slightly tighter outer radius to leave room for the grid.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { chartCardShell, chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADIAL_CHANNEL_DATA,
  createRadialTooltip,
  renderRadialRingsChart,
  type RadialSeriesDatum,
} from "./chart-radial-shared.js";

export interface ChartRadialGridProps {
  data?: RadialSeriesDatum[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  gridCircleCount?: number;
  outerRadius?: number;
}

/**
 * shadcn/ui "chart-radial-grid" recipe — five rings over polar gridlines
 * instead of solid background tracks. Call with no arguments for a working
 * demo.
 */
function chartRadialGrid(props: ChartRadialGridProps = {}): DomphyElement<"div"> {
  const {
    data = RADIAL_CHANNEL_DATA,
    title = "Radial Chart - Grid",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total sessions by acquisition channel",
    gridCircleCount = 4,
    outerRadius = 82,
  } = props;

  const tooltip = createRadialTooltip();

  return chartCardShell({
    title,
    description,
    content: {
      div: [
        renderRadialRingsChart({
          data,
          tooltip,
          showBackgroundTrack: false,
          showGridCircles: true,
          gridCircleCount,
          outerRadius,
          sweepMode: "value",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadialGrid };
