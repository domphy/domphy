// shadcn/ui "charts/radar-icons" recipe — clean-room reimplementation.
//
// Identical to chartRadarLegend, except each legend entry swaps its plain
// color swatch for a small directional arrow icon in that series' accent
// color (a downward arrow for one series, an upward arrow for the other).
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { chartTrendFooter, type ChartLegendEntry, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADAR_MULTI_SERIES,
  RADAR_MONTHLY_MULTI_DATA,
  createRadarTooltip,
  radarCardShell,
  renderRadarChart,
  type RadarPoint,
  type RadarSeriesConfig,
} from "./chart-radar-shared.js";

export interface ChartRadarIconsProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
}

/**
 * shadcn/ui "charts/radar-icons" recipe — the Legend recipe with directional
 * arrow icons instead of plain swatches. Call with no arguments for a
 * working demo.
 */
function chartRadarIcons(props: ChartRadarIconsProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_MULTI_DATA,
    series = RADAR_MULTI_SERIES,
    title = "Radar Chart - Icons",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total visitors for the last 6 months",
  } = props;

  const tooltip = createRadarTooltip();
  const legendEntries: ChartLegendEntry[] = series.map((entry) => ({
    label: entry.label,
    color: entry.color,
    icon: entry.icon ?? "up",
  }));

  return radarCardShell({
    title,
    description,
    content: {
      div: [
        renderRadarChart({
          data,
          series,
          tooltip,
          tooltipShowLabel: false,
          tooltipIndicator: "line",
          legend: legendEntries,
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarIcons };
