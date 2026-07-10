// shadcn/ui "charts/radar-grid-none" recipe — clean-room reimplementation.
//
// The most minimal radar recipe: no polar grid rings or spokes — only the
// angle axis's own faint outer boundary hexagon, the six month labels, and a
// single translucent data polygon with corner dots. Minimal, value-only
// hover tooltip.
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

export interface ChartRadarGridNoneProps {
  data?: RadarPoint[];
  series?: RadarSeriesConfig[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  showDots?: boolean;
  showGrid?: boolean;
}

/**
 * shadcn/ui "charts/radar-grid-none" recipe — a single-series radar chart
 * with no background grid. Call with no arguments for a working demo.
 */
function chartRadarGridNone(
  props: ChartRadarGridNoneProps = {},
): DomphyElement<"div"> {
  const {
    data = RADAR_MONTHLY_SINGLE_DATA,
    series = RADAR_SINGLE_SERIES,
    title = "Radar Chart - Grid None",
    description = "Showing total visitors for the last 6 months",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "January - June 2026",
    showDots = true,
    showGrid = false,
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
          // "Grid none" hides the polar grid's rings and spokes but NOT the
          // angle axis's own outer boundary line — upstream <PolarAngleAxis>
          // defaults axisLine=true / axisLineType="polygon", so a faint
          // perimeter hexagon still connects the six month vertices. Render
          // just that single outer ring (no inner rings, no spokes) unless the
          // caller opts into the full grid.
          gridShape: "polygon",
          gridRingFractions: showGrid ? undefined : [1],
          gridShowSpokes: showGrid,
          showDots,
          dotRadius: 4,
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

export { chartRadarGridNone };
