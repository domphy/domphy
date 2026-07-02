// shadcn/ui "chart-radial-shape" recipe — clean-room reimplementation.
//
// A single-series radial gauge: one short, thick, flat-capped arc (about a
// third of the circle) over a muted full-circle track, framed by two thin
// decorative outline circles (one just outside in a muted tone, one just
// inside in the card's own background tone) for a subtly inset look. The
// metric's value is printed large and bold at the chart's center, with a
// smaller muted caption beneath it. Purely static — no tooltip.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import { chartCardShell, chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import { renderRadialGauge } from "./chart-radial-shared.js";

export interface ChartRadialShapeProps {
  value?: number;
  color?: ThemeColor;
  captionText?: string;
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  footerCaptionText?: string;
  sweepDegrees?: number;
  innerRadiusRatio?: number;
  showDecorativeCircles?: boolean;
  showBackgroundTrack?: boolean;
}

/**
 * shadcn/ui "chart-radial-shape" recipe — a compact single-value gauge card
 * with a short flat-capped arc and a large centered number. Call with no
 * arguments for a working demo.
 */
function chartRadialShape(props: ChartRadialShapeProps = {}): DomphyElement<"div"> {
  const {
    value = 1125,
    color = "primary",
    captionText = "Visitors",
    title = "Radial Chart - Shape",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    footerCaptionText = "Showing total visitors for the last 6 months",
    sweepDegrees = 100,
    innerRadiusRatio = 0.66,
    showDecorativeCircles = true,
    showBackgroundTrack = true,
  } = props;

  return chartCardShell({
    title,
    description,
    content: {
      div: [
        renderRadialGauge({
          color,
          sweepDegrees,
          innerRadiusRatio,
          showDecorativeCircles,
          showBackgroundTrack,
          valueText: value.toLocaleString("en-US"),
          captionText,
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText: footerCaptionText }),
  });
}

export { chartRadialShape };
