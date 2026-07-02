// shadcn/ui "charts/radar-radius" recipe — clean-room reimplementation.
//
// The two-series radar chart with an added faint radius-axis reference line
// running from the chart's center out to the edge at a fixed angle (60°,
// no visible tick labels) — a single line, not a full symmetric cross. The
// hover tooltip now explicitly shows the month name as a heading above both
// series' values.
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
  showRadiusAxisLine?: boolean;
}

/**
 * shadcn/ui "charts/radar-radius" recipe — the multi-series radar chart with
 * a visible radius-axis reference line. Call with no arguments for a working
 * demo.
 */
function chartRadarRadius(props: ChartRadarRadiusProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_MULTI_DATA,
    series = RADAR_MULTI_SERIES,
    title = "Radar Chart - Radius Axis",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    radiusAxisAngle = 60,
    showRadiusAxisLine = true,
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
          showRadiusAxisLine,
          radiusAxisAngle,
          tooltipShowLabel: true,
          tooltipIndicator: "line",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarRadius };
