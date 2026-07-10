// shadcn/ui "chart-radial" (default/"simple" recipe) — clean-room
// reimplementation.
//
// A card-framed radial bar chart: five concentric rings (one per category),
// each swept proportionally to its value against a pale full-circle track,
// with flat arc ends and a rotating five-hue accent palette. Hovering a ring
// shows a small swatch+label tooltip near the cursor.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  type ChartTrendDirection,
  chartTrendFooter,
} from "./chart-area-shared.js";
import {
  createRadialTooltip,
  RADIAL_CHANNEL_DATA,
  type RadialSeriesDatum,
  radialCardShell,
  renderRadialRingsChart,
} from "./chart-radial-shared.js";

export interface ChartRadialSimpleProps {
  data?: RadialSeriesDatum[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  showBackgroundTrack?: boolean;
  outerRadius?: number;
  innerRadius?: number;
}

/**
 * shadcn/ui "chart-radial" default recipe — a five-ring radial bar chart
 * with a trend footer. Call with no arguments for a working demo.
 */
function chartRadialSimple(
  props: ChartRadialSimpleProps = {},
): DomphyElement<"div"> {
  const {
    data = RADIAL_CHANNEL_DATA,
    title = "Radial Chart",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total sessions by acquisition channel",
    showBackgroundTrack = true,
    outerRadius,
    innerRadius,
  } = props;

  const tooltip = createRadialTooltip();

  return radialCardShell({
    title,
    description,
    content: {
      div: [
        renderRadialRingsChart({
          data,
          tooltip,
          showBackgroundTrack,
          outerRadius,
          innerRadius,
          sweepMode: "value",
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

export { chartRadialSimple };
