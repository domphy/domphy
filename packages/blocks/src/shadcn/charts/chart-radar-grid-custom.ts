// shadcn/ui "charts/radar-grid-custom" recipe — clean-room reimplementation.
//
// A stripped-down grid: just one thin polygon ring at a fixed (roughly
// mid-to-outer) radius, no radial spoke lines, deliberately understated so
// the data shape reads as the dominant visual element. Hover tooltip shows a
// swatch and value for the nearest month (no month-name heading).
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

export interface ChartRadarGridCustomProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  ringFraction?: number;
  showSpokes?: boolean;
}

/**
 * shadcn/ui "charts/radar-grid-custom" recipe — a single-series radar chart
 * over a single custom ring. Call with no arguments for a working demo.
 */
function chartRadarGridCustom(
  props: ChartRadarGridCustomProps = {},
): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Grid Custom",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
    ringFraction = 0.75,
    showSpokes = false,
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
          gridRingFractions: [ringFraction],
          gridShowSpokes: showSpokes,
          tooltipShowLabel: false,
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

export { chartRadarGridCustom };
