// magicui "Spinning Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A short
// phrase (typically repeated with a separator to fill the ring) arranged so
// each character sits at its own point on an invisible circle, oriented to
// follow the circle's curvature — then the whole ring of pre-placed
// characters spins as one rigid group via a single continuous CSS rotation.
// Purely declarative: no imperative/lifecycle code is needed since every
// character's placement is a static, precomputed transform.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";

export interface SpinningTextProps {
  /** Text content, repeated with `separator` until the ring reads as full. Defaults to a short demo phrase. */
  children?: string;
  /** Seconds per full rotation. Defaults to 10. */
  duration?: number;
  /** Radius of the circular path, in `themeSpacing` units. Defaults to 5. */
  radius?: number;
  /** Spins counter-clockwise instead of clockwise. Defaults to false. */
  reverse?: boolean;
  /** Joins repeats of `children` when the ring needs filling out. Defaults to " • ". */
  separator?: string;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

// How many characters the ring targets before it reads as "full" — short
// phrases get repeated (with `separator`) until they reach roughly this length.
const TARGET_RING_LENGTH = 28;

/**
 * A short phrase spinning continuously in a full circle, like text wrapped
 * around an invisible ring — each character is pre-placed at its own angle
 * around the circle, and the whole set rotates together as a rigid disc.
 * Starts spinning automatically on mount, forever, clockwise by default.
 * Call with no arguments for a working demo.
 */
function spinningText(props: SpinningTextProps = {}): DomphyElement<"div"> {
  const phrase = props.children ?? "learn more";
  const separator = props.separator ?? " • ";
  const durationSeconds = props.duration ?? 10;
  const radiusUnits = props.radius ?? 5;
  const reverse = props.reverse ?? false;

  const repeatUnit = `${phrase}${separator}`;
  let ringText = repeatUnit;
  while (ringText.length < TARGET_RING_LENGTH) ringText += repeatUnit;
  const characters = Array.from(ringText);

  const radiusStyle = themeSpacing(radiusUnits);
  const diameterStyle = themeSpacing(radiusUnits * 2);

  const keyframes = {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  };
  const animationName = `spinning-text-rotate-${hashString(JSON.stringify(keyframes))}`;

  const characterSpans: DomphyElement<"span">[] = characters.map(
    (character, index) => {
      const angleDegrees = (360 / characters.length) * index;
      return {
        // Non-breaking space so bare spaces in the phrase render as real content.
        span: character === " " ? " " : character,
        _key: `character-${index}`,
        style: {
          position: "absolute",
          insetBlockStart: "50%",
          insetInlineStart: "50%",
          transformOrigin: "0 0",
          transform: `rotate(${angleDegrees}deg) translate(0, calc(${radiusStyle} * -1))`,
        },
      };
    },
  );

  return {
    div: [
      {
        div: characterSpans,
        ariaHidden: "true",
        _key: "ring",
        style: {
          position: "absolute",
          inset: 0,
          animation: `${animationName} ${durationSeconds}s linear infinite ${reverse ? "reverse" : "normal"}`,
          [`@keyframes ${animationName}`]: keyframes,
        } as StyleObject,
      },
    ],
    role: "img",
    ariaLabel: phrase,
    style: {
      position: "relative",
      display: "inline-block",
      width: diameterStyle,
      height: diameterStyle,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { spinningText };
