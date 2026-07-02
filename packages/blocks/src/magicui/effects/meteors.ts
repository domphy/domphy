// Magic UI "Meteors" — clean-room reimplementation.
//
// A decorative background effect that continuously spawns thin glowing
// streaks ("meteors") shooting diagonally across a bounded, overflow-hidden
// container, like a meteor shower behind hero text or cards. Implemented
// purely from the block's public functional/visual spec — no upstream Magic
// UI source was viewed or copied.
//
// Pure CSS: a single shared `@keyframes` rule animates every meteor's
// position/opacity along the configured trajectory angle; each meteor gets
// its own randomized `animation-delay`/`animation-duration` (computed once at
// generation time) so the shared keyframe plays out staggered per element.
// No JS animation loop is required. Because the animation loops infinitely,
// each meteor replays the same path every cycle — only its initial timing is
// randomized, not a fresh position per loop (a JS-driven per-cycle respawn
// would need a rAF loop instead of pure CSS; see the component's
// `fidelityNotes` for this tradeoff).

import type { DomphyElement, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface MeteorsProps {
  /** Number of meteors rendered. Defaults to `20`. */
  count?: number;
  /** Minimum randomized start delay, in seconds. Defaults to `0.2`. */
  minDelay?: number;
  /** Maximum randomized start delay, in seconds. Defaults to `1.2`. */
  maxDelay?: number;
  /** Minimum randomized fall duration, in seconds. Defaults to `2`. */
  minDuration?: number;
  /** Maximum randomized fall duration, in seconds. Defaults to `10`. */
  maxDuration?: number;
  /** Trajectory angle in degrees (215 = down-and-to-the-left). Defaults to `215`. */
  angle?: number;
  /** Theme color family for the meteor head/tail glow. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Foreground content layered above the shower. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let meteorsInstanceCounter = 0;

/**
 * A layered field of continuously falling, staggered "meteor" streaks behind
 * foreground content — a decorative CSS-only meteor shower. Call with no
 * arguments for a working demo — a dark panel with 20 staggered meteors
 * behind a heading.
 */
function meteors(props: MeteorsProps = {}): DomphyElement<"div"> {
  const instanceId = ++meteorsInstanceCounter;
  const count = Math.max(1, Math.round(props.count ?? 20));
  const minDelay = props.minDelay ?? 0.2;
  const maxDelay = props.maxDelay ?? 1.2;
  const minDuration = props.minDuration ?? 2;
  const maxDuration = props.maxDuration ?? 10;
  const angle = props.angle ?? 215;
  const color = props.color ?? "neutral";

  // Travel distance is expressed in `vmax` (viewport-relative, not a literal
  // rem/em/px length) so a single shared keyframe reliably carries every
  // meteor off any container's edge regardless of its size.
  const keyframes = {
    "0%": { transform: `rotate(${angle}deg) translateX(0)`, opacity: 1 },
    "70%": { opacity: 1 },
    "100%": { transform: `rotate(${angle}deg) translateX(-100vmax)`, opacity: 0 },
  };
  const animationName = `meteor-fall-${hashString(JSON.stringify({ keyframes, instanceId }))}`;

  const meteorElements: DomphyElement[] = Array.from({ length: count }, (_unused, index) => {
    const leftPercent = Math.random() * 100;
    const delaySeconds = minDelay + Math.random() * Math.max(0, maxDelay - minDelay);
    const durationSeconds = minDuration + Math.random() * Math.max(0, maxDuration - minDuration);

    return {
      span: null,
      _key: `meteor-${instanceId}-${index}`,
      ariaHidden: "true",
      // Decorative streak with no text of its own — exempt from the
      // missing-color contract (mirrors fadeOverlay() in the marquee block).
      // Also exempt from tone-background-inherit: a meteor's glow is
      // intentionally a fixed bright accent, not a surface that should track
      // the ambient dataTone context.
      _doctorDisable: ["missing-color", "tone-background-inherit"],
      style: {
        position: "absolute",
        top: 0,
        left: `${leftPercent}%`,
        width: themeSpacing(0.5),
        height: themeSpacing(0.5),
        borderRadius: "50%",
        // shift-11/-9 (not a small shift-1/-2) so the head/tail read as a
        // bright glow against the dark shift-15 container surface — a small
        // shift only nudges toward the opposite edge by a couple of ramp
        // steps and would barely be distinguishable from the background.
        backgroundColor: (listener) => themeColor(listener, "shift-11", color),
        boxShadow: (listener) =>
          `0 0 ${themeSpacing(2)} ${themeColor(listener, "shift-9", color)}`,
        animation: `${animationName} ${durationSeconds}s linear ${delaySeconds}s infinite`,
        "&::before": {
          content: `""`,
          position: "absolute",
          top: "50%",
          right: 0,
          width: themeSpacing(14),
          height: themeSpacing(0.25),
          transform: "translateY(-50%)",
          background: (listener) =>
            `linear-gradient(to left, ${themeColor(listener, "shift-11", color)}, transparent)`,
        },
      } as StyleObject,
    } as DomphyElement;
  });

  const defaultChildren: DomphyElement[] = [
    { h2: "Meteor Shower", $: [heading()] } as DomphyElement,
    {
      p: "A layered field of streaking meteors behind your content.",
      $: [paragraph()],
    } as DomphyElement,
  ];
  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultChildren;

  return {
    div: [
      ...meteorElements,
      { div: contentChildren, style: { position: "relative", zIndex: 1 } },
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      [`@keyframes ${animationName}`]: keyframes,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { meteors };
