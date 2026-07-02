// shadcn/ui "charts/radar-lines-only" recipe — clean-room reimplementation.
//
// Two data series rendered as pure colored outlines (zero area fill) so
// their overlaps stay readable, over a grid whose radial spoke lines are
// suppressed (only the concentric polygon rings remain). Uses a tighter,
// more overlapping sample dataset so the two outlines visibly cross.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADAR_MULTI_SERIES,
  RADAR_MONTHLY_TIGHT_DATA,
  createRadarTooltip,
  radarCardShell,
  renderRadarChart,
  type RadarPoint,
  type RadarSeriesConfig,
} from "./chart-radar-shared.js";

export interface ChartRadarLinesOnlyProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  showFill?: boolean;
  showSpokes?: boolean;
}

/**
 * shadcn/ui "charts/radar-lines-only" recipe — two stroke-only radar
 * outlines with no fill and no radial spokes. Call with no arguments for a
 * working demo.
 */
function chartRadarLinesOnly(props: ChartRadarLinesOnlyProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_TIGHT_DATA,
    series = RADAR_MULTI_SERIES,
    title = "Radar Chart - Lines Only",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
    showFill = false,
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
          strokeOnly: !showFill,
          gridShowSpokes: showSpokes,
          tooltipShowLabel: false,
          tooltipIndicator: "line",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarLinesOnly };
