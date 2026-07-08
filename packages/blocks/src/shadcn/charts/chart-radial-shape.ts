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

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeSpacing, type ThemeColor } from "@domphy/theme";
import { motion } from "@domphy/ui";
import { chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  polarPoint,
  RADIAL_CENTER,
  RADIAL_GROW_TRANSITION,
  RADIAL_VIEW_SIZE,
  radialArcLength,
  radialBackgroundTrack,
  radialCardShell,
  radialCenterLabel,
  radialThinCircle,
} from "./chart-radial-shared.js";

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

// Single-arc gauge, inlined here rather than routed through the shared
// renderRadialGauge, so the arc reproduces recharts' RadialBarChart placement
// for this recipe. Recharts' default startAngle=0 is due-East (3 o'clock) and
// its positive sweep runs counter-clockwise, so a ~100° bar starts at 3
// o'clock, grows up and over the top, and ends ~10° past 12 o'clock (with a
// flat butt cap at the East start). renderRadialGauge instead hardcodes a
// 12-o'clock start with a clockwise sweep and exposes no start-angle knob;
// it is a shared helper this pass may not edit, so this recipe builds its own
// arc from the exported ring/track/label primitives.
function renderShapeGauge(props: {
  color: ThemeColor;
  sweepDegrees: number;
  innerRadiusRatio: number;
  showDecorativeCircles: boolean;
  showBackgroundTrack: boolean;
  valueText: string;
  captionText: string;
}): DomphyElement<"div"> {
  const { color, sweepDegrees, innerRadiusRatio, showDecorativeCircles, showBackgroundTrack, valueText, captionText } = props;
  const outerRadius = 90;
  const cx = RADIAL_CENTER;
  const cy = RADIAL_CENTER;
  const thickness = outerRadius * (1 - innerRadiusRatio);
  const ringRadius = outerRadius - thickness / 2;

  // Angle convention (see polarPoint): 0° = 12 o'clock, increasing clockwise,
  // so due-East = +90°. The flat start-cap sits at East and the bar sweeps
  // counter-clockwise up over the top, ending at (90 − sweep). Drawing the
  // path from the East start also makes the grow-in stroke reveal run from
  // East, matching recharts' bar animation.
  const startAngle = 90;
  const endAngle = 90 - sweepDegrees;
  const startPoint = polarPoint(cx, cy, ringRadius, startAngle);
  const endPoint = polarPoint(cx, cy, ringRadius, endAngle);
  const largeArcFlag = sweepDegrees > 180 ? 1 : 0;
  // sweep-flag 0 = counter-clockwise (East → over the top).
  const arcPath = `M ${startPoint.x} ${startPoint.y} A ${ringRadius} ${ringRadius} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y}`;
  const arcLength = radialArcLength(ringRadius, 0, sweepDegrees) || 0.0001;

  const children: DomphyElement[] = [];
  if (showBackgroundTrack) {
    children.push({ ...radialBackgroundTrack(cx, cy, ringRadius, thickness), _key: "track" });
  }
  if (showDecorativeCircles) {
    children.push(
      { ...radialThinCircle(cx, cy, ringRadius + thickness / 2 + 3, "muted"), _key: "decorative-outer" },
      { ...radialThinCircle(cx, cy, ringRadius - thickness / 2 - 3, "surface"), _key: "decorative-inner" },
    );
  }
  children.push({
    path: null,
    d: arcPath,
    fill: "none",
    stroke: (listener: Listener) => themeColor(listener, "shift-9", color),
    strokeWidth: thickness,
    strokeLinecap: "butt",
    strokeDasharray: arcLength,
    $: [
      motion({
        initial: { strokeDashoffset: arcLength },
        animate: { strokeDashoffset: 0 },
        transition: RADIAL_GROW_TRANSITION,
      }),
    ],
    _key: "value",
  } as DomphyElement<"path">);

  return {
    div: [
      {
        svg: children,
        viewBox: `0 0 ${RADIAL_VIEW_SIZE} ${RADIAL_VIEW_SIZE}`,
        style: { width: "100%", height: "100%", display: "block", overflow: "visible" },
      } as DomphyElement<"svg">,
      radialCenterLabel({ valueText, captionText }),
    ],
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      maxHeight: themeSpacing(72),
      marginInline: "auto",
    },
  };
}

/**
 * shadcn/ui "chart-radial-shape" recipe — a compact single-value gauge card
 * with a short flat-capped arc and a large centered number. Call with no
 * arguments for a working demo.
 */
function chartRadialShape(props: ChartRadialShapeProps = {}): DomphyElement<"div"> {
  const {
    value = 1125,
    color = "secondary",
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

  return radialCardShell({
    title,
    description,
    content: {
      div: [
        renderShapeGauge({
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
