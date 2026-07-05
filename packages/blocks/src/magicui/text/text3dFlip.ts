// Magic UI "Text 3D Flip" — clean-room reimplementation matched, via a
// direct source diff, to upstream's real interaction model.
//
// A line of heading-sized text where every character is a tiny 3D "cube
// corner": a front face carrying the resting glyph and a second, perpendicular
// face carrying the SAME glyph (offset out along the character's own depth by
// half a line so it doesn't clip through). On hover the whole line plays a
// ONE-SHOT ripple: each character rolls 90° so its perpendicular face swings
// into view, staggered character-by-character so the roll reads as a wave
// crossing the word — then every character SNAPS BACK to its resting front
// face. It is a transient ripple that passes through, not a state that holds
// while the pointer stays over the text. Same glyph on both faces, so the
// instant reset is imperceptible and only the roll-through is visible.
//
// Technique: a JS mouseenter handler drives the Web Animations API per
// character (`element.animate()` with a per-character `delay`), exactly the
// one-shot-then-return shape upstream's framer-motion `animate(...)` +
// zero-duration reset produces. No perspective is applied anywhere (upstream
// is orthographic), so the `translateZ`/`translateX(50%)` depth offsets only
// position the faces — they never foreshorten — and the resting cube-corner
// transform is visually identity. `fill: "none"` makes each animation revert
// to that resting transform the instant it finishes, which IS the snap-back.
// Default flip edge is right/rotateY (upstream's default). A CSS cubic-bezier
// "back out" curve approximates the spring settle upstream tunes via
// mass/stiffness/damping (Domphy has no spring primitive; same documented gap
// as numberTicker/smoothCursor).

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import { heading } from "@domphy/ui";
import { type ThemeColor, themeColor } from "@domphy/theme";

export type Text3dFlipEdge = "top" | "bottom" | "left" | "right";
export type Text3dFlipStaggerFrom = "first" | "last" | "center" | "random" | number;

export interface Text3dFlipProps {
  /** Text to flip. Defaults to a short demo phrase. */
  children?: string;
  /**
   * Opt-in Domphy extra: a second phrase shown on the flipped (back) face.
   * Defaults to the same text as `children` — i.e. the same glyph on both
   * faces, matching upstream exactly. Only diverges from upstream if you set it.
   */
  flippedChildren?: string;
  /** Which edge each character rolls around. Defaults to `"right"` (upstream's default), i.e. rotateY. */
  edge?: Text3dFlipEdge;
  /** Per-character stagger increment, in ms. Defaults to `50`. */
  staggerDelay?: number;
  /** Where the stagger wave originates: the first character, the last, the center, a random
   * character (re-picked per play), or a specific index. Defaults to `"first"`. */
  staggerFrom?: Text3dFlipStaggerFrom;
  /** How long each character's own roll takes, in ms. Defaults to `500`. */
  duration?: number;
  /** CSS easing for the roll. Defaults to a bouncy "back out" cubic-bezier approximating upstream's spring settle. */
  easing?: string;
  /** Theme color role for the resting, front-facing text. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /**
   * Opt-in Domphy extra: theme color role for the flipped (back) face. Defaults to the same value as
   * `color` so both faces look identical (upstream behavior). Only diverges if you set it.
   */
  flippedColor?: ThemeColor;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
  /** Passthrough style merged onto every front-facing character. */
  frontStyle?: StyleObject;
  /** Passthrough style merged onto every flipped (back) character. */
  flippedStyle?: StyleObject;
}

const DEFAULT_TEXT = "Fortune favors the bold";
// A "back out" cubic-bezier — overshoots past the resting angle before
// settling, the closest a fixed CSS easing curve gets to upstream's
// moderately-damped spring without a JS physics loop.
const DEFAULT_SPRING_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// Standard visually-hidden ("sr-only") style: keeps the full phrase in the
// accessibility tree while the per-character flip cells (which a screen reader
// would otherwise announce letter-by-letter) are marked decorative. Upstream
// carries the same sr-only full-text span.
const SR_ONLY_STYLE: StyleObject = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// Ported verbatim from upstream's four transform maps (magicui text-3d-flip).
// The container's resting transform, the front-face and second-face offsets,
// and the hover roll target — all keyed by which edge the character rolls
// around. `lh`/`0.5lh` tie the cube depth to the line height; percentages tie
// the left/right roll to each character's own width. No perspective is set
// anywhere, so every non-rotational term here is a pure depth offset.
const ROTATION_MAP: Record<Text3dFlipEdge, string> = {
  top: "rotateX(90deg)",
  right: "rotateY(90deg)",
  bottom: "rotateX(-90deg)",
  left: "rotateY(-90deg)",
};

const CONTAINER_TRANSFORMS: Record<Text3dFlipEdge, string> = {
  top: "translateZ(-0.5lh)",
  bottom: "translateZ(-0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
};

const FRONT_FACE_TRANSFORMS: Record<Text3dFlipEdge, string> = {
  top: "translateZ(0.5lh)",
  bottom: "translateZ(0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
  right: "rotateY(-90deg) translateX(50%) rotateY(90deg)",
};

const SECOND_FACE_TRANSFORMS: Record<Text3dFlipEdge, string> = {
  top: "rotateX(-90deg) translateZ(0.5lh)",
  right:
    "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)",
  bottom: "rotateX(90deg) translateZ(0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(50%) rotateY(-90deg) translateX(50%)",
};

/** Distance (in stagger units) of character `index` from the wave origin. */
function staggerDistance(index: number, totalCharacters: number, from: Text3dFlipStaggerFrom): number {
  if (from === "first") return index;
  if (from === "last") return totalCharacters - 1 - index;
  if (from === "center") return Math.abs(Math.floor(totalCharacters / 2) - index);
  if (from === "random") {
    const randomIndex = Math.floor(Math.random() * totalCharacters);
    return Math.abs(randomIndex - index);
  }
  return Math.abs(from - index);
}

interface CharacterCellOptions {
  edge: Text3dFlipEdge;
  color: ThemeColor;
  flippedColor: ThemeColor;
  frontStyle?: StyleObject;
  flippedStyle?: StyleObject;
}

/** Renders one character's two-face 3D cell: a resting front face plus a
 * perpendicular second face carrying the same (or opt-in different) glyph. */
function characterCell(
  frontCharacter: string,
  flippedCharacter: string,
  keyIndex: number,
  options: CharacterCellOptions,
): DomphyElement<"span"> {
  const faceBase: StyleObject = {
    display: "block",
    height: "1lh",
    backfaceVisibility: "hidden",
  };

  return {
    span: [
      {
        span: frontCharacter,
        dataFace: "front",
        style: {
          ...faceBase,
          position: "relative",
          transform: FRONT_FACE_TRANSFORMS[options.edge],
          color: (listener: Listener) => themeColor(listener, "shift-11", options.color),
          ...(options.frontStyle ?? {}),
        } as StyleObject,
      },
      {
        span: flippedCharacter,
        dataFace: "back",
        ariaHidden: "true",
        style: {
          ...faceBase,
          position: "absolute",
          top: 0,
          left: 0,
          transform: SECOND_FACE_TRANSFORMS[options.edge],
          color: (listener: Listener) => themeColor(listener, "shift-11", options.flippedColor),
          ...(options.flippedStyle ?? {}),
        } as StyleObject,
      },
    ],
    dataFlipChar: "true",
    _key: `char-${keyIndex}`,
    style: {
      display: "inline-block",
      transformStyle: "preserve-3d",
      transform: CONTAINER_TRANSFORMS[options.edge],
    } as StyleObject,
  };
}

/**
 * A line of heading-sized text whose characters roll 90° in 3D around a shared
 * edge on hover — a one-shot ripple that staggers across the word and then
 * snaps back to rest (it does not hold while hovered). Call with no arguments
 * for a working demo; hover the phrase to see the ripple pass through.
 */
function text3dFlip(props: Text3dFlipProps = {}): DomphyElement<"h2"> {
  const text = props.children ?? DEFAULT_TEXT;
  const flippedText = props.flippedChildren ?? text;
  const edge = props.edge ?? "right";
  const staggerDelay = props.staggerDelay ?? 50;
  const staggerFrom = props.staggerFrom ?? "first";
  const duration = props.duration ?? 500;
  const easing = props.easing ?? DEFAULT_SPRING_EASING;
  const color = props.color ?? "neutral";
  const flippedColor = props.flippedColor ?? color;

  const cellOptions: CharacterCellOptions = {
    edge,
    color,
    flippedColor,
    frontStyle: props.frontStyle,
    flippedStyle: props.flippedStyle,
  };

  // Group by word (upstream does the same) so a flex-wrap never breaks a word
  // across lines; the whitespace between words is its own non-flipping cell.
  // `keyIndex` runs across the whole phrase so keys stay unique.
  const words = text.split(" ");
  const flippedWords = flippedText.split(" ");
  let keyIndex = 0;
  const children: DomphyElement[] = [];
  words.forEach((word, wordIndex) => {
    const frontCharacters = Array.from(word);
    const flippedCharacters = Array.from(flippedWords[wordIndex] ?? word);
    const cells = frontCharacters.map((character, charIndex) => {
      const cell = characterCell(
        character,
        flippedCharacters[charIndex] ?? character,
        keyIndex,
        cellOptions,
      );
      keyIndex += 1;
      return cell;
    });
    children.push({
      span: cells,
      _key: `word-${wordIndex}`,
      style: { display: "inline-flex" } as StyleObject,
    } as DomphyElement);
    if (wordIndex !== words.length - 1) {
      children.push({
        span: " ",
        _key: `space-${wordIndex}`,
        style: { whiteSpace: "pre" } as StyleObject,
      } as DomphyElement);
    }
  });

  // Accessible text lives in an sr-only span; the animated cells are decorative
  // (aria-hidden) so a screen reader reads the phrase once, not letter-by-letter.
  const accessibleLabel: DomphyElement<"span"> = {
    span: text,
    _key: "sr-only",
    style: SR_ONLY_STYLE,
  };
  const flipVisual: DomphyElement<"span"> = {
    span: children,
    ariaHidden: "true",
    _key: "flip-visual",
    style: {
      display: "flex",
      flexWrap: "wrap",
      position: "relative",
    } as StyleObject,
  };

  return {
    h2: [accessibleLabel, flipVisual],
    $: [heading({ color })],
    style: {
      position: "relative",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;
      if (typeof element.animate !== "function") return;

      const restTransform = CONTAINER_TRANSFORMS[edge];
      const rollTransform = ROTATION_MAP[edge];
      let isAnimating = false;
      let running: Animation[] = [];

      const play = () => {
        if (isAnimating) return;
        // Queried lazily at hover time, not at mount: the parent's _onMount
        // fires before the character cells are attached to the DOM.
        const boxes = Array.from(element.querySelectorAll<HTMLElement>("[data-flip-char]"));
        if (boxes.length === 0) return;
        const total = boxes.length;
        isAnimating = true;
        running = boxes.map((box, index) => {
          const delayMs = staggerDistance(index, total, staggerFrom) * staggerDelay;
          // Roll from the resting cube-corner transform to the 90° face swap,
          // then — with fill "none" — instantly revert to rest when done. That
          // instant revert is the snap-back; same glyph both faces makes it
          // imperceptible, so only the staggered roll-through reads visually.
          return box.animate(
            [{ transform: restTransform }, { transform: rollTransform }],
            { duration, delay: delayMs, easing, fill: "none" },
          );
        });
        Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
          isAnimating = false;
          running = [];
        });
      };

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const handleMouseEnter = () => {
        if (!prefersReducedMotion) play();
      };
      element.addEventListener("mouseenter", handleMouseEnter);

      node.addHook("Remove", () => {
        element.removeEventListener("mouseenter", handleMouseEnter);
        for (const animation of running) animation.cancel();
      });
    },
  };
}

export { text3dFlip };
