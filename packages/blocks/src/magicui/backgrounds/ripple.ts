// Magic UI "Ripple" — clean-room reimplementation.
//
// A stack of concentric, gently pulsing circular rings centered behind other
// content — typically used to draw attention to a focal element such as a
// logo or headline. Implemented purely from the block's public
// functional/visual spec — no upstream Magic UI source was viewed or
// copied.
//
// Pure CSS: every ring plays the exact same `@keyframes` "breathe" loop
// (scale slightly inward, then back to full size, eased, infinite) — only
// each ring's `animation-delay` differs, growing by a small constant per
// ring index. Because every ring is just breathing in place with a staggered
// start, the population reads as an outward-radiating ripple purely through
// timing, with no ring ever actually growing past its own fixed diameter.
// The whole stack is `mask-image`-clipped so it fades to nothing toward the
// bottom edge of its container (the same `linear-gradient` mask technique as
// this package's `progressiveBlur`).

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface RippleProps {
  /** Diameter of the innermost ring, in px. Defaults to `210`. */
  mainCircleSize?: number;
  /** Opacity of the innermost ring. Each successive ring loses a further `0.03`. Defaults to `0.24`. */
  mainCircleOpacity?: number;
  /** How many concentric rings to render. Defaults to `8`. */
  numCircles?: number;
  /** Theme color family for the ring borders/glow. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Foreground content layered above/centered within the ripple. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let rippleInstanceCounter = 0;

const RING_SIZE_STEP = 70;
const RING_OPACITY_STEP = 0.03;
const RING_DELAY_STEP_SECONDS = 0.06;

const PULSE_KEYFRAMES = {
  "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
  "50%": { transform: "translate(-50%, -50%) scale(0.9)" },
};

function ringElement(
  index: number,
  mainCircleSize: number,
  mainCircleOpacity: number,
  color: ThemeColor,
  animationName: string,
): DomphyElement {
  const size = mainCircleSize + index * RING_SIZE_STEP;
  // Upstream applies no lower bound: rings past the opacity budget render at
  // 0 / negative (invisible), so numCircles >= 9 fades out rather than
  // holding a visible floor.
  const opacity = mainCircleOpacity - index * RING_OPACITY_STEP;
  const delaySeconds = index * RING_DELAY_STEP_SECONDS;

  return {
    div: null,
    _key: `ring-${index}`,
    ariaHidden: "true",
    // Decorative ring outline with no text of its own — exempt from the
    // missing-color contract (mirrors meteors.ts's streak spans). Also
    // exempt from low-opacity: this is an ambient background ring, not an
    // interactive control that needs to stay discoverable at rest.
    _doctorDisable: ["missing-color", "low-opacity"],
    style: {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      transform: "translate(-50%, -50%)",
      opacity,
      // Faint translucent disc fill (upstream's `bg-foreground/25`): 8 nested
      // rings stack these into a soft radial buildup toward the center, not
      // just concentric outlines.
      backgroundColor: (listener: Listener) =>
        `color-mix(in srgb, ${themeColor(listener, "shift-9", color)} 25%, transparent)`,
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: (listener: Listener) => themeColor(listener, "shift-9", color),
      // Upstream ring uses Tailwind `shadow-xl` — a two-layer downward
      // translucent-black elevation drop shadow, not a symmetric colored glow.
      boxShadow:
        "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      animation: `${animationName} 2s ease ${delaySeconds}s infinite`,
      [`@keyframes ${animationName}`]: PULSE_KEYFRAMES,
    } as StyleObject,
  } as DomphyElement;
}

/**
 * A stack of concentric rings that gently pulse with staggered delays,
 * reading as an outward ripple radiating from a focal center. Call with no
 * arguments for a working demo — 8 rings behind a centered heading.
 */
function ripple(props: RippleProps = {}): DomphyElement<"div"> {
  const mainCircleSize = Math.max(1, props.mainCircleSize ?? 210);
  const mainCircleOpacity = props.mainCircleOpacity ?? 0.24;
  const numCircles = Math.max(1, Math.round(props.numCircles ?? 8));
  const color = props.color ?? "neutral";

  const instanceId = ++rippleInstanceCounter;
  const animationName = `ripple-pulse-${hashString(
    JSON.stringify({ instanceId, PULSE_KEYFRAMES }),
  )}`;

  const rings: DomphyElement[] = Array.from({ length: numCircles }, (_unused, index) =>
    ringElement(index, mainCircleSize, mainCircleOpacity, color, animationName),
  );

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Ripple", $: [heading()] } as DomphyElement,
        {
          p: "Concentric rings gently pulsing outward from the center.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  const ringsWrapper: DomphyElement = {
    div: rings,
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      pointerEvents: "none",
      maskImage: "linear-gradient(to bottom, black, transparent)",
      WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
    } as StyleObject,
  } as DomphyElement;

  return {
    div: [
      ringsWrapper,
      {
        div: contentChildren,
        style: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        },
      } as DomphyElement,
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { ripple };
