// Magic UI "Border Beam" — clean-room reimplementation.
//
// A short bright segment of light that continuously travels around a
// container's rounded-rectangle border, like a comet chasing itself around
// the card's edge. Implemented as a pure CSS/SVG loop (a normalized-length
// `<rect>` stroke-dasharray "comet" animated via `stroke-dashoffset`) — no
// JS measurement, resize listeners, or animation-frame loop needed, so the
// beam degrades gracefully to a static outline wherever CSS animations are
// disabled.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";
import type { ThemeColor } from "@domphy/theme";

export interface BorderBeamProps {
  /** Length of the glowing comet, as a percentage (0-100) of the border perimeter. Defaults to `20`. */
  size?: number;
  /** Stroke width in pixels the beam renders at. Defaults to `2`. */
  thickness?: number;
  /** Corner radius in pixels, should roughly match the host card's own rounding. Defaults to `16`. */
  borderRadius?: number;
  /** Gradient start color. Defaults to `"warning"` (warm). */
  colorFrom?: ThemeColor;
  /** Gradient end color. Defaults to `"primary"` (cool). */
  colorTo?: ThemeColor;
  /** Full loop duration in seconds. Defaults to `6`. */
  duration?: number;
  /** Delay before the loop starts, in seconds — use to stagger multiple beams. Defaults to `0`. */
  delay?: number;
  /** Runs the comet counter-clockwise instead of clockwise. */
  reverse?: boolean;
  /** Card content rendered inside the beamed container. Defaults to a small demo card body. */
  children?: DomphyElement[];
}

let borderBeamInstanceCounter = 0;

/**
 * A card-like container with a comet of light continuously orbiting its
 * rounded border — a "premium/active" ambient indicator. Call with no
 * arguments for a working demo card.
 */
function borderBeam(props: BorderBeamProps = {}): DomphyElement<"div"> {
  const {
    size = 20,
    thickness = 2,
    borderRadius = 16,
    colorFrom = "warning",
    colorTo = "primary",
    duration = 6,
    delay = 0,
    reverse = false,
    children = [
      { h3: "Border Beam", $: [heading()] },
      {
        p: "A comet of light continuously orbits this card's border to signal a premium/active state.",
        $: [paragraph({ color: "neutral" })],
      },
    ],
  } = props;

  const instanceId = ++borderBeamInstanceCounter;
  const gradientId = `domphy-border-beam-gradient-${instanceId}`;
  const animationName = hashString(
    `border-beam-${instanceId}-${size}-${duration}-${reverse}`,
  );

  const dashArray = `${size} ${100 - size}`;
  const keyframes = {
    from: { strokeDashoffset: "0" },
    to: { strokeDashoffset: reverse ? "100" : "-100" },
  };

  // `<stop>` is a paint-server node, not text — it has no `color` to follow the
  // tone context, so the `missing-color` doctor rule is a false positive here.
  const gradientStop = (offset: string, color: ThemeColor): DomphyElement =>
    ({
      stop: null,
      offset,
      style: { stopColor: (listener) => themeColor(listener, "shift-9", color) },
      _doctorDisable: "missing-color",
    }) as DomphyElement;

  const orbitRect = (strokeWidth: number, blur: number, opacity: number): DomphyElement =>
    ({
      rect: null,
      x: "1",
      y: "1",
      width: "calc(100% - 2px)",
      height: "calc(100% - 2px)",
      rx: String(Math.max(borderRadius - 1, 0)),
      ry: String(Math.max(borderRadius - 1, 0)),
      fill: "none",
      stroke: `url(#${gradientId})`,
      strokeWidth: String(strokeWidth),
      strokeLinecap: "round",
      pathLength: "100",
      strokeDasharray: dashArray,
      style: {
        opacity,
        ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
        animation: `${animationName} ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        [`@keyframes ${animationName}`]: keyframes,
      },
    }) as DomphyElement;

  return {
    div: [
      {
        div: children,
        style: {
          position: "relative",
          zIndex: 1,
          padding: themeSpacing(6),
        },
      } as DomphyElement,
      {
        svg: [
          {
            defs: [
              {
                linearGradient: [gradientStop("0%", colorFrom), gradientStop("100%", colorTo)],
                id: gradientId,
                gradientUnits: "objectBoundingBox",
                x1: "0%",
                y1: "0%",
                x2: "100%",
                y2: "100%",
              } as DomphyElement,
            ],
          } as DomphyElement,
          // A wider, blurred duplicate underneath gives the comet a soft halo.
          orbitRect(thickness * 3, 3, 0.5),
          orbitRect(thickness, 0, 1),
        ],
        width: "100%",
        height: "100%",
        xmlns: "http://www.w3.org/2000/svg",
        ariaHidden: "true",
        style: { position: "absolute", inset: 0, pointerEvents: "none" },
      } as DomphyElement,
    ],
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: `${borderRadius}px`,
      backgroundColor: (listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener) => themeColor(listener, "shift-10", "neutral"),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      outlineOffset: "-1px",
    },
  };
}

export { borderBeam };
