// Magic UI "Shine Border" — clean-room reimplementation.
//
// A decorative animated border: a vivid multi-hue shine band that
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

import type { DomphyElement, ElementNode } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import { themeColor, themeSpacing } from "@domphy/theme";
import { heading, paragraph } from "@domphy/ui";

export interface ShineBorderProps {
  /** Ring thickness in pixels. Defaults to `1`. */
  thickness?: number;
  /** One full rotation, in seconds — slower/calmer than `borderBeam`'s comet. Defaults to `14`. */
  duration?: number;
  /** Colors the shine band blends through, in order. Defaults to a vivid three-hue gradient `["primary", "secondary", "warning"]` — the animated multicolor shine is the point of the component (mirrors the upstream docs demo's `#A07CFE/#FE8FB5/#FFBE7B` trio within the theme's own families). */
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
    colors = ["primary", "secondary", "warning"],
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
      _key: key,
    }) as DomphyElement;
  const stops: DomphyElement[] = [
    transparentStop("0%", "stop-start"),
    ...(colors.map((color, index) => ({
      stop: null,
      offset: `${((index + 1) / (colors.length + 1)) * 100}%`,
      style: {
        stopColor: (listener) => themeColor(listener, "shift-9", color),
      },
      _key: `stop-${index}`,
    })) as DomphyElement[]),
    transparentStop("100%", "stop-end"),
  ];

  const ringRect = (
    strokeWidth: number,
    blur: number,
    opacity: number,
  ): DomphyElement =>
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
        // Decorative ring, not a control — the enclosing <svg> already sets
        // pointer-events: none, restated here so doctor's low-opacity rule
        // (which reads each element's own style, not an inherited one) can
        // see the same exemption.
        pointerEvents: "none",
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
        // The `<animateTransform>` above carries SMIL's implicit `begin="0s"`,
        // which resolves against the DOCUMENT's SVG time container — already
        // running long before any block mounts. Blink does not retro-activate
        // an interval whose begin instant is in the past, so a late-inserted
        // SMIL animation never paints at all, `repeatCount="indefinite"`
        // notwithstanding. Measured in Chromium: 0 changed pixels over 1.5s,
        // while `getStartTime()` reported 0, `getSimpleDuration()` 14 and
        // `svg.animationsPaused()` false. It is the document clock, not this
        // element or Domphy's DOM construction — the identical markup written
        // by hand, or built with `createElementNS`, animates on a fresh page
        // and is equally inert once injected into a page that has been up a
        // few seconds. `beginElement()` restarts the interval at the current
        // time, which is all that is needed.
        //
        // It has to land on a LATER frame than the mount: measured, calling it
        // synchronously in this hook (or from `setTimeout(…, 0)`) still gives
        // 0 changed pixels, while one `requestAnimationFrame` gives ~11k — the
        // element is in the DOM but its time container has not ticked yet, so
        // the begin instant is dropped.
        _onMount: (node: ElementNode) => {
          if (typeof requestAnimationFrame !== "function") return;
          const frame = requestAnimationFrame(() => {
            const animation = (
              node.domElement as SVGSVGElement | null
            )?.querySelector("animateTransform") as SVGAnimateElement | null;
            animation?.beginElement?.();
          });
          node.addHook("Remove", () => cancelAnimationFrame(frame));
        },
      } as DomphyElement,
    ],
    // `borderRadius` below is the caller-supplied `borderRadius` number prop
    // (matches upstream's own contract), not a design-system constant.
    _doctorDisable: "raw-spacing-value",
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
