// Magic UI "Border Beam" — verified directly against the real upstream source
// (registry/magicui/border-beam.tsx, MIT-licensed).
//
// A short bright comet of light continuously travels around a container's
// rounded-rectangle border. Upstream's exact technique (faithfully ported
// here, replacing an earlier clean-room SVG stroke-dasharray approximation
// that could not reproduce the comet's fading tail): a `pointer-events-none`
// overlay whose CSS mask reveals ONLY the border ring (the standard
// intersect-of-`padding-box`-and-`border-box` mask, the same idiom this
// package's `shinyButton.ts` already uses), containing a single small square
// element that rides a rounded-rectangle `offset-path` and is painted with a
// `linear-gradient(to left, colorFrom, colorTo, transparent)` — a bright head
// fading to a fully transparent tail, i.e. a real directional comet fade, not
// a spatial two-color stroke. A negative `animation-delay` is a phase offset
// (the beam animates immediately, shifted in its cycle) so several beams can
// be staggered while all running at once — matching upstream's `delay: -delay`.
//
// The port keeps the demo card wrapper (background/outline/children) as the
// self-contained container this package renders each block inside; the beam
// overlay is the faithful part. Upstream's raw hexes map to theme roles so the
// beam follows light/dark theme: `colorFrom` #ffaa40 (warm) → `warning`, and
// `colorTo` #9c40ff (violet) → `secondary` (this theme's rose/magenta, the
// closest built-in to violet — the same substitution `rainbowButton.ts`
// documents), not `primary` (a cool/blue tone that weakened the endpoint hue).

import type { DomphyElement, StyleObject } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import { themeColor, themeSpacing } from "@domphy/theme";
import { heading, paragraph } from "@domphy/ui";

export interface BorderBeamProps {
  /** Diameter of the traveling comet in pixels; also the corner radius of its orbit path. Defaults to `50` (upstream `size`). */
  size?: number;
  /** Width in pixels of the border ring the comet is masked into. Defaults to `1` (upstream `borderWidth`). */
  thickness?: number;
  /** Corner radius in pixels, should roughly match the host card's own rounding. Defaults to `16`. */
  borderRadius?: number;
  /** Comet head color (bright end of the fade). Defaults to `"warning"` (warm, upstream #ffaa40). */
  colorFrom?: ThemeColor;
  /** Comet mid color (fades on to a transparent tail). Defaults to `"secondary"` (violet, upstream #9c40ff). */
  colorTo?: ThemeColor;
  /** Full loop duration in seconds. Defaults to `6`. */
  duration?: number;
  /** Negative phase offset in seconds applied immediately (staggers multiple beams that all run at once) — NOT a start delay. Defaults to `0`. */
  delay?: number;
  /** Runs the comet counter-clockwise instead of clockwise. */
  reverse?: boolean;
  /** Starting position along the orbit as a percentage (0-100) — another way to stagger multiple beams. Defaults to `0`. */
  initialOffset?: number;
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
    size = 50,
    thickness = 1,
    borderRadius = 16,
    colorFrom = "warning",
    colorTo = "secondary",
    duration = 6,
    delay = 0,
    reverse = false,
    initialOffset = 0,
    children = [
      { h3: "Border Beam", $: [heading()] },
      {
        p: "A comet of light continuously orbits this card's border to signal a premium/active state.",
        $: [paragraph({ color: "neutral" })],
      },
    ],
  } = props;

  const instanceId = ++borderBeamInstanceCounter;
  const animationName = `border-beam-move-${instanceId}`;

  // Upstream animate range: `${initialOffset}%`→`${100+initialOffset}%`
  // clockwise, mirrored `${100-initialOffset}%`→`${-initialOffset}%` reverse.
  const keyframes = {
    from: {
      offsetDistance: reverse ? `${100 - initialOffset}%` : `${initialOffset}%`,
    },
    to: {
      offsetDistance: reverse
        ? `${-initialOffset}%`
        : `${100 + initialOffset}%`,
    },
  };

  // The comet: a small square riding a rounded-rect `offset-path`, painted with
  // a bright-head → transparent-tail gradient. `_doctorDisable`/`ariaHidden`
  // mirror `rainbowButton.ts`' glow layer — it is a themed, decorative surface
  // with no text of its own, so the `missing-color` rule is a false positive.
  const cometBox = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      width: `${size}px`,
      height: `${size}px`,
      offsetPath: `rect(0 auto auto 0 round ${size}px)`,
      background: (listener) =>
        `linear-gradient(to left, ${themeColor(listener, "shift-9", colorFrom)}, ${themeColor(
          listener,
          "shift-9",
          colorTo,
        )}, transparent)`,
      animation: `${animationName} ${duration}s linear infinite`,
      // Negative delay = immediate phase offset (upstream `delay: -delay`).
      animationDelay: `${-delay}s`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  } as DomphyElement<"div">;

  // The overlay: a transparent-bordered box masked to reveal ONLY the border
  // ring (intersect of the padding-box and border-box mask layers), clipping
  // the comet so it appears to travel along the border. `#000` in the mask is
  // an alpha mask, not a theme color — `mask-image` is not a color property so
  // the raw-color doctor rule does not apply.
  const beamOverlay = {
    div: [cometBox],
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      borderRadius: "inherit",
      border: `${thickness}px solid transparent`,
      maskImage:
        "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
      maskClip: "padding-box, border-box",
      maskComposite: "intersect",
    } as StyleObject,
  } as DomphyElement<"div">;

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
      beamOverlay,
    ],
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: `${borderRadius}px`,
      backgroundColor: (listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener) => themeColor(listener, "shift-10", "neutral"),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      outlineOffset: "-1px",
    },
  };
}

export { borderBeam };
