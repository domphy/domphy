// shadcn/ui "charts/radar-grid-circle-fill" recipe — clean-room
// reimplementation.
//
// Combines the circular grid rings from chartRadarGridCircle with a soft
// tinted backdrop (same idea as chartRadarGridFill, but round instead of
// polygonal). The data polygon's fill opacity is reduced so the tinted
// rings stay visible through it. Unlike the rest of the grid family, this
// recipe keeps the standard labeled tooltip (month heading + value).
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

export interface ChartRadarGridCircleFillProps {
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
 * shadcn/ui "charts/radar-grid-circle-fill" recipe — a single-series radar
 * chart over a tinted circular grid, with the standard labeled tooltip.
 * Call with no arguments for a working demo.
 */
function chartRadarGridCircleFill(props: ChartRadarGridCircleFillProps = {}): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Grid Circle Filled",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
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
          gridShape: "circle",
          gridFill: { color: resolvedSeries[0].color, opacity: gridFillOpacity },
          tooltipShowLabel: true,
          tooltipIndicator: "swatch",
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadarGridCircleFill };
