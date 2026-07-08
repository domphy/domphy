// shadcn/ui "charts/radar-label-custom" recipe — clean-room reimplementation.
//
// The two-series radar chart with its plain month-name axis labels replaced
// by a two-line custom label at each spoke tip: a bolder "value/value" line
// on top, and a smaller muted month-name line below it. The topmost label is
// nudged further outward so it clears the card header.
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

export interface ChartRadarLabelCustomProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
}

/**
 * shadcn/ui "charts/radar-label-custom" recipe — the multi-series radar
 * chart with two-line value/month tick labels. Call with no arguments for a
 * working demo.
 */
function chartRadarLabelCustom(props: ChartRadarLabelCustomProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_MULTI_DATA,
    series = RADAR_MULTI_SERIES,
    title = "Radar Chart - Custom Label",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
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
          customLabels: true,
          tooltipShowLabel: true,
          tooltipIndicator: "line",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarLabelCustom };
