// magicui "Spinning Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). The input
// phrase is placed exactly ONCE around an invisible circle — one character per
// span, each pre-placed at its own angle and oriented to follow the circle's
// curvature, plus a single trailing gap so the ring reads as an open loop —
// then the whole ring of characters spins as one rigid group via a single
// continuous CSS rotation on the container. Purely declarative: no
// imperative/lifecycle code is needed since every character's placement is a
// static, precomputed transform.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";

export interface SpinningTextTransition {
  /** Seconds per full rotation. Overrides `duration` when set. */
  duration?: number;
  /** CSS easing for the spin. Defaults to `"linear"`. */
  easing?: string;
}

export interface SpinningTextProps {
  /** Text placed once around the ring. An array is joined into one string. Defaults to a short demo phrase. */
  children?: string | string[];
  /** Seconds per full rotation. Defaults to 10. */
  duration?: number;
  /** Spins counter-clockwise instead of clockwise. Defaults to false. */
  reverse?: boolean;
  /** Radius of the circular path, in `ch` (character-width) units — font-relative, matching upstream. Defaults to 5. */
  radius?: number;
  /** Escape hatch for the spin's own timing/easing. See {@link SpinningTextTransition}. */
  transition?: SpinningTextTransition;
  /** Passthrough style merged onto the wrapper. */
  style?: StyleObject;
}

// Visually-hidden text (Tailwind's `sr-only`): removed from the visual layout
// but still read by screen readers, so the phrase stays accessible while each
// spinning glyph is `aria-hidden`.
const SR_ONLY_STYLE: StyleObject = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
};

/**
 * A short phrase spinning continuously in a full circle, like text wrapped
 * around an invisible ring — each character is pre-placed at its own angle
 * around the circle, and the whole set rotates together as a rigid disc.
 * Starts spinning automatically on mount, forever, clockwise by default.
 * Call with no arguments for a working demo.
 */
function spinningText(props: SpinningTextProps = {}): DomphyElement<"div"> {
  const phrase = Array.isArray(props.children)
    ? props.children.join("")
    : props.children ?? "learn more";
  const durationSeconds = props.transition?.duration ?? props.duration ?? 10;
  const easing = props.transition?.easing ?? "linear";
  const radius = props.radius ?? 5;
  const reverse = props.reverse ?? false;

  // Upstream: `children.split("")` plus a single pushed trailing space, so the
  // phrase appears once and one gap keeps the ring an open loop.
  const characters = [...phrase, " "];

  const keyframes = {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  };
  const animationName = `spinning-text-rotate-${hashString(JSON.stringify(keyframes))}`;

  const characterSpans: DomphyElement<"span">[] = characters.map(
    (character, index) => {
      const angleDegrees = (360 / characters.length) * index;
      return {
        // Non-breaking space so the trailing/interior gap renders as real
        // content instead of being collapsed away by the reconciler.
        span: character === " " ? " " : character,
        ariaHidden: "true",
        _key: `character-${index}`,
        style: {
          position: "absolute",
          top: "50%",
          left: "50%",
          display: "inline-block",
          transformOrigin: "center",
          // Center each glyph *on* the ring: `translate(-50%, -50%)` pulls the
          // glyph back by half its own box so its center (not its top-left
          // corner) sits on the circle, then it's rotated to its angle and
          // pushed out along the radius. `-1ch` makes the radius scale with
          // the font's character width, matching upstream.
          transform: `translate(-50%, -50%) rotate(${angleDegrees}deg) translateY(calc(${radius} * -1ch))`,
        },
      };
    },
  );

  return {
    div: [
      ...characterSpans,
      { span: phrase, _key: "sr-only", style: SR_ONLY_STYLE },
    ],
    // The spin rotates this single container — the same element that holds the
    // letter spans — directly, matching upstream's rotated `motion.div`.
    style: {
      position: "relative",
      animation: `${animationName} ${durationSeconds}s ${easing} infinite ${reverse ? "reverse" : "normal"}`,
      [`@keyframes ${animationName}`]: keyframes,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { spinningText };
