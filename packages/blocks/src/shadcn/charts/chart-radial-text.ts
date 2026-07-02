// shadcn/ui "chart-radial-text" recipe — clean-room reimplementation.
//
// A single-value gauge in the same family as chartRadialShape, but with a
// much thinner ring that sweeps most of the circle (leaving only a small
// gap) and ends in distinctly rounded, pill-like caps instead of flat ones.
// Same centered value/caption text treatment and decorative framing circles
// as chartRadialShape — treat the two as parameter presets of one underlying
// single-value gauge (see renderRadialGauge in ./chart-radial-shared.ts).
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import { chartCardShell, chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import { renderRadialGauge } from "./chart-radial-shared.js";

export interface ChartRadialTextProps {
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
 * shadcn/ui "chart-radial-text" recipe — a compact single-value gauge card
 * with a thin, near-full-circle rounded-cap arc and a large centered number.
 * Call with no arguments for a working demo.
 */
function chartRadialText(props: ChartRadialTextProps = {}): DomphyElement<"div"> {
  const {
    value = 1125,
    color = "primary",
    captionText = "Visitors",
    title = "Radial Chart - Text",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    footerCaptionText = "Showing total visitors for the last 6 months",
    sweepDegrees = 250,
    innerRadiusRatio = 0.85,
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
          capStyle: "round",
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

export { chartRadialText };
