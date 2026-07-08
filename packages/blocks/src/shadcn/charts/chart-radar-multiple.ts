// shadcn/ui "charts/radar-multiple" recipe — clean-room reimplementation.
//
// Two overlapping radar series (desktop/mobile) plotted on the same
// hexagonal axis: the first stays translucent (~60% opacity) while the
// second renders essentially opaque, so it visibly pokes through the first
// wherever the two shapes overlap. Hovering lists both series' values for
// the nearest month, each row marked with a thin line-style indicator.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADAR_MULTI_SERIES,
  RADAR_MONTHLY_MULTI_DATA,
  createRadarTooltip,
  radarCardShell,
  renderRadarChart,
  type RadarPoint,
  type RadarSeriesConfig,
  type RadarTooltipIndicator,
} from "./chart-radar-shared.js";

export interface ChartRadarMultipleProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  tooltipIndicator?: RadarTooltipIndicator;
}

/**
 * shadcn/ui "charts/radar-multiple" recipe — two overlapping radar series
 * for direct comparison. Call with no arguments for a working demo.
 */
function chartRadarMultiple(props: ChartRadarMultipleProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_MULTI_DATA,
    series = RADAR_MULTI_SERIES,
    title = "Radar Chart - Multiple",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
    tooltipIndicator = "line",
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
          tooltipShowLabel: true,
          tooltipIndicator,
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarMultiple };
