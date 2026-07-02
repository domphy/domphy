// shadcn/ui "chart-radial-stacked" recipe — clean-room reimplementation.
//
// A half-circle gauge: one thick band spanning the top half of the circle,
// split end-to-end into two (or more) rounded-cap colored segments sized by
// their share of the total, with a large bold total number and a smaller
// muted caption centered in the gauge's open area. Hovering either segment
// shows a swatch + value tooltip.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { chartCardShell, chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADIAL_STACKED_SEGMENTS,
  createRadialTooltip,
  renderRadialStackedGauge,
  type RadialSeriesDatum,
} from "./chart-radial-shared.js";

export interface ChartRadialStackedProps {
  segments?: RadialSeriesDatum[];
  totalCaptionText?: string;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  footerCaptionText?: string;
  sweepDegrees?: number;
  innerRadiusRatio?: number;
}

/**
 * shadcn/ui "chart-radial-stacked" recipe — a half-circle two-segment gauge
 * with a centered total. Call with no arguments for a working demo.
 */
function chartRadialStacked(props: ChartRadialStackedProps = {}): DomphyElement<"div"> {
  const {
    segments = RADIAL_STACKED_SEGMENTS,
    totalCaptionText = "Total customers",
    title = "Radial Chart - Stacked",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    footerCaptionText = "Showing total customers for the last 6 months",
    sweepDegrees = 180,
    innerRadiusRatio = 0.75,
  } = props;

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const tooltip = createRadialTooltip();

  return chartCardShell({
    title,
    description,
    content: {
      div: [
        renderRadialStackedGauge({
          segments,
          tooltip,
          totalText: total.toLocaleString("en-US"),
          captionText: totalCaptionText,
          sweepDegrees,
          innerRadiusRatio,
        }),
      ],
      style: { display: "flex", alignItems: "center", justifyContent: "center" },
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText: footerCaptionText }),
  });
}

export { chartRadialStacked };
