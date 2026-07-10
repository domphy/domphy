// shadcn/ui "charts/radar-legend" recipe — clean-room reimplementation.
//
// The two-series radar chart (chartRadarMultiple) with a static swatch+label
// legend row added just beneath the plot. The plot itself is nudged upward
// (extra negative bottom margin) so the legend can sit close underneath it
// instead of at the default gap distance.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  type ChartLegendEntry,
  type ChartTrendDirection,
  chartTrendFooter,
} from "./chart-area-shared.js";
import {
  createRadarTooltip,
  RADAR_MONTHLY_MULTI_DATA,
  RADAR_MULTI_SERIES,
  type RadarPoint,
  type RadarSeriesConfig,
  radarCardShell,
  renderRadarChart,
} from "./chart-radar-shared.js";

export interface ChartRadarLegendProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  showLegend?: boolean;
}

/**
 * shadcn/ui "charts/radar-legend" recipe — the multi-series radar chart with
 * a swatch legend row underneath. Call with no arguments for a working demo.
 */
function chartRadarLegend(
  props: ChartRadarLegendProps = {},
): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_MULTI_DATA,
    series = RADAR_MULTI_SERIES,
    title = "Radar Chart - Legend",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
    showLegend = true,
  } = props;

  const tooltip = createRadarTooltip();
  const legendEntries: ChartLegendEntry[] = series.map((entry) => ({
    label: entry.label,
    color: entry.color,
  }));

  return radarCardShell({
    title,
    description,
    // Upstream chart-radar-legend uses a plain `items-center` header (no pb-4).
    headerPaddingBottom: false,
    content: {
      div: [
        renderRadarChart({
          data,
          series,
          tooltip,
          tooltipIndicator: "line",
          legend: showLegend ? legendEntries : null,
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

export { chartRadarLegend };
