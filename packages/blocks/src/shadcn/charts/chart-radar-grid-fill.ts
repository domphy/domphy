// shadcn/ui "charts/radar-grid-fill" recipe — clean-room reimplementation.
//
// The default single-series hexagonal radar chart, but the grid's own
// polygon shape carries a soft, low-opacity tint in the same accent hue as
// the data series, giving the chart canvas a faint colored backdrop. The
// data polygon's own fill opacity is reduced slightly so the tinted grid
// stays visible through it. Hover tooltip shows a swatch + series label +
// value, no category heading.
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

export interface ChartRadarGridFillProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  gridFillOpacity?: number;
  seriesFillOpacity?: number;
}

/**
 * shadcn/ui "charts/radar-grid-fill" recipe — a single-series radar chart
 * with a tinted grid backdrop. Call with no arguments for a working demo.
 */
function chartRadarGridFill(props: ChartRadarGridFillProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Grid Filled",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2024",
    gridFillOpacity = 0.2,
    seriesFillOpacity = 0.5,
  } = props;

  const resolvedSeries: RadarSeriesConfig[] = series.map((entry) => ({ ...entry, fillOpacity: seriesFillOpacity }));
  const tooltip = createRadarTooltip();

  return radarCardShell({
    title,
    description,
    content: {
      div: [
        renderRadarChart({
          data,
          series: resolvedSeries,
          tooltip,
          gridFill: { color: resolvedSeries[0].color, opacity: gridFillOpacity },
          tooltipShowLabel: false,
          tooltipIndicator: "swatch",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarGridFill };
