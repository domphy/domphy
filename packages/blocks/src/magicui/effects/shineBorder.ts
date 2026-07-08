// Magic UI "Shine Border" — clean-room reimplementation.
//
// A decorative animated border: a subtle single-hue shine band that
// continuously sweeps around a container's rounded outline (contrast with
// `borderBeam`, which animates a single traveling comet). Implemented as a
// full-perimeter SVG ring stroked with a gradient — transparent flanks around
// the shine color, matching upstream's `radial-gradient(transparent,
// transparent, shineColor, transparent, transparent)` — whose orientation is
// continuously rotated by a native SMIL `<animateTransform>`. Pure declarative
// markup: no JS timers, resize listeners, or measurement, so it degrades to a
// static gradient ring wherever SMIL is unavailable, and to a static ring for
// users with `prefers-reduced-motion: reduce` (upstream's `motion-safe:` gate).
//
// Defaults and reduced-motion behavior verified against the real upstream
// source (registry/magicui/shine-border.tsx, MIT-licensed); the SMIL ring is a
// technique substitution for upstream's CSS `animate-shine` (see SOURCES.md).

import type { DomphyElement } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";
import type { ThemeColor } from "@domphy/theme";

export interface ShineBorderProps {
  /** Ring thickness in pixels. Defaults to `1`. */
  thickness?: number;
  /** One full rotation, in seconds — slower/calmer than `borderBeam`'s comet. Defaults to `14`. */
  duration?: number;
  /** Colors the shine band blends through, in order. Defaults to a single subtle hue `["neutral"]` (upstream's `#000000`). */
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
    thickness = 1,
    duration = 14,
    colors = ["neutral"],
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
  //
  // Upstream flanks the shine color(s) with transparent on both ends
  // (`radial-gradient(transparent, transparent, <shineColor>, transparent,
  // transparent)`), so even a single subtle hue reads as a moving band rather
  // than a flat uniform ring. Mirror that: transparent → color(s) across the
  // middle → transparent, with the SMIL rotation below sweeping the band around.
  const transparentStop = (offset: string, key: string): DomphyElement =>
    ({
      stop: null,
      offset,
      style: { stopColor: "transparent" },
      _doctorDisable: "missing-color",
      _key: key,
    }) as DomphyElement;
  const stops: DomphyElement[] = [
    transparentStop("0%", "stop-start"),
    ...(colors.map((color, index) => ({
      stop: null,
      offset: `${((index + 1) / (colors.length + 1)) * 100}%`,
      style: { stopColor: (listener) => themeColor(listener, "shift-9", color) },
      _doctorDisable: "missing-color",
      _key: `stop-${index}`,
    })) as DomphyElement[]),
    transparentStop("100%", "stop-end"),
  ];

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

  // Upstream gates the shine behind `motion-safe:animate-shine`, so users who
  // request `prefers-reduced-motion: reduce` get a static ring. SMIL can't be
  // gated by a CSS media query, so snapshot the preference at build time and
  // omit the `<animateTransform>` entirely — leaving the same static gradient
  // ring upstream's `motion-safe:` gate leaves. (Build-time snapshot, not a live
  // listener; a mid-session OS toggle takes effect on the next render.)
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
                  ...(prefersReducedMotion
                    ? []
                    : [
                        {
                          animateTransform: null,
                          attributeName: "gradientTransform",
                          type: "rotate",
                          from: "0 0.5 0.5",
                          to: "360 0.5 0.5",
                          dur: `${duration}s`,
                          repeatCount: "indefinite",
                        } as DomphyElement,
                      ]),
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
