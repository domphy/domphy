// Magic UI "Shine Border" — clean-room reimplementation.
//
// A decorative animated border whose color itself continuously rotates
// through a gradient of colors — a shimmering, shifting outline rather than
// a moving dot of light (contrast with `borderBeam`, which animates a single
// traveling comet). Implemented as a full-perimeter SVG ring stroked with a
// gradient whose orientation is continuously rotated by a native SMIL
// `<animateTransform>` — pure declarative markup, no JS timers, resize
// listeners, or measurement needed, so it degrades to a static gradient ring
// wherever SMIL is unavailable.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";
import type { ThemeColor } from "@domphy/theme";

export interface ShineBorderProps {
  /** Ring thickness in pixels. Defaults to `2`. */
  thickness?: number;
  /** One full rotation, in seconds — slower/calmer than `borderBeam`'s comet. Defaults to `14`. */
  duration?: number;
  /** Colors the ring blends through, in order. Defaults to `["primary", "highlight", "warning"]`. */
  colors?: ThemeColor[];
  /** Corner radius in pixels, should roughly match the host card's own rounding. Defaults to `16`. */
  borderRadius?: number;
  /** Card content rendered inside the shined container. Defaults to a small demo card body. */
  children?: DomphyElement[];
}

let shineBorderInstanceCounter = 0;

/**
 * A card-like container whose border ring continuously shimmers through a
 * rotating color gradient — an always-on ambient "premium" highlight. Call
 * with no arguments for a working demo card.
 */
function shineBorder(props: ShineBorderProps = {}): DomphyElement<"div"> {
  const {
    thickness = 2,
    duration = 14,
    colors = ["primary", "highlight", "warning"],
    borderRadius = 16,
    children = [
      { h3: "Shine Border", $: [heading()] },
      {
        p: "A rotating gradient ring shimmers around this card as a calm, always-on premium highlight.",
        $: [paragraph({ color: "neutral" })],
      },
    ],
  } = props;

  const instanceId = ++shineBorderInstanceCounter;
  const gradientId = `domphy-shine-border-gradient-${instanceId}`;

  // `<stop>` is a paint-server node, not text — it has no `color` to follow the
  // tone context, so the `missing-color` doctor rule is a false positive here.
  const stopCount = Math.max(colors.length, 2);
  const stops: DomphyElement[] = colors.map((color, index) => ({
    stop: null,
    offset: `${(index / (stopCount - 1)) * 100}%`,
    style: { stopColor: (listener) => themeColor(listener, "shift-9", color) },
    _doctorDisable: "missing-color",
    _key: `stop-${index}`,
  })) as DomphyElement[];
  // Repeat the first color at 100% so the rotation has no visible hard seam.
  stops.push({
    stop: null,
    offset: "100%",
    style: { stopColor: (listener) => themeColor(listener, "shift-9", colors[0]) },
    _doctorDisable: "missing-color",
    _key: "stop-loop",
  } as DomphyElement);

  const ringRect = (strokeWidth: number, blur: number, opacity: number): DomphyElement =>
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
      style: {
        opacity,
        ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
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
                linearGradient: [
                  ...stops,
                  {
                    animateTransform: null,
                    attributeName: "gradientTransform",
                    type: "rotate",
                    from: "0 0.5 0.5",
                    to: "360 0.5 0.5",
                    dur: `${duration}s`,
                    repeatCount: "indefinite",
                  } as DomphyElement,
                ],
                id: gradientId,
                gradientUnits: "objectBoundingBox",
                x1: "0%",
                y1: "0%",
                x2: "100%",
                y2: "0%",
              } as DomphyElement,
            ],
          } as DomphyElement,
          // A wider, blurred duplicate underneath gives the ring a soft shimmer.
          ringRect(thickness * 2.5, 3, 0.45),
          ringRect(thickness, 0, 1),
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
    },
  };
}

export { shineBorder };
