// Magic UI "Text 3D Flip" — clean-room reimplementation.
//
// A line of heading-sized text where every character sits on its own 3D
// "card": a front face carrying the resting glyph and a back face carrying a
// second glyph/phrase, both hinged around the same edge (top/bottom/left/
// right). Hovering the whole line flips every character from front to back,
// staggered by a small per-character delay so the flip reads as a wave
// crossing the word rather than one simultaneous snap. Implemented purely
// from the block's public functional/visual spec — no upstream Magic UI
// source was viewed or copied.
//
// Pure CSS 3D transforms + `transition`, no JS animation loop: the flip is
// driven entirely by a `&:hover [data-face=...]` rule on the outer wrapper
// (no framer-motion, no per-character JS timers). A CSS cubic-bezier
// overshoot curve approximates the spring-like bounce the spec describes —
// Domphy's `motion()` patch only supports Web Animations enter/exit/State
// keyframes, not a continuously interactive hover-driven transform, so a
// hand-authored transition is the right tool here (same reasoning
// `scrollBasedVelocity.ts` uses for its own plain-CSS/rAF techniques).

import type { DomphyElement, StyleObject } from "@domphy/core";
import { heading } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type Text3dFlipEdge = "top" | "bottom" | "left" | "right";
export type Text3dFlipStaggerFrom = "start" | "end" | "center" | number;

export interface Text3dFlipProps {
  /** Front-facing phrase. Defaults to a short demo quote. */
  children?: string;
  /** Phrase revealed on the flipped (back) face. Defaults to the same text as `children`, rendered
   * in `flippedColor` — i.e. "the same text in a different style" per the spec's default variant. */
  flippedChildren?: string;
  /** Which edge each character hinges around. Defaults to `"top"`. */
  edge?: Text3dFlipEdge;
  /** Per-character stagger increment, in ms. Defaults to `50`. */
  staggerDelay?: number;
  /** Where the stagger wave originates: from the first character, the last, the center, or a
   * specific character index (rippling outward from there). Defaults to `"start"`. */
  staggerFrom?: Text3dFlipStaggerFrom;
  /** How long each character's own flip takes, in ms. Defaults to `500`. */
  duration?: number;
  /** CSS easing for the flip. Defaults to a bouncy cubic-bezier overshoot approximating spring
   * physics (moderate damping/stiffness — bouncy but controlled, not floppy). */
  easing?: string;
  /** Theme color role for the resting, front-facing text. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Theme color role for the revealed, flipped text. Defaults to `"primary"`. */
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
// settling, the closest a fixed CSS easing curve gets to a bouncy,
// moderately-damped spring without a JS physics loop.
const DEFAULT_SPRING_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

function staggerDistance(index: number, totalCharacters: number, from: Text3dFlipStaggerFrom): number {
  if (from === "start") return index;
  if (from === "end") return totalCharacters - 1 - index;
  if (from === "center") return Math.abs(index - (totalCharacters - 1) / 2);
  return Math.abs(index - from);
}

function transformOriginForEdge(edge: Text3dFlipEdge): string {
  switch (edge) {
    case "top":
      return "center top";
    case "bottom":
      return "center bottom";
    case "left":
      return "left center";
    case "right":
      return "right center";
  }
}

function rotationAxisForEdge(edge: Text3dFlipEdge): "X" | "Y" {
  return edge === "left" || edge === "right" ? "Y" : "X";
}

interface CharacterCellOptions {
  edge: Text3dFlipEdge;
  duration: number;
  easing: string;
  staggerDelay: number;
  staggerFrom: Text3dFlipStaggerFrom;
  color: ThemeColor;
  flippedColor: ThemeColor;
  frontStyle?: StyleObject;
  flippedStyle?: StyleObject;
}

/** Renders a single character's two-face flip cell. Space characters keep their layout width via a
 * non-breaking space so the phrase's spacing survives being split into individually-styled cells. */
function characterCell(
  frontCharacter: string,
  flippedCharacter: string,
  index: number,
  totalCharacters: number,
  options: CharacterCellOptions,
): DomphyElement<"span"> {
  const delayMs = staggerDistance(index, totalCharacters, options.staggerFrom) * options.staggerDelay;
  const axis = rotationAxisForEdge(options.edge);
  const origin = transformOriginForEdge(options.edge);
  const transition = `transform ${options.duration}ms ${options.easing} ${delayMs}ms`;
  const glyph = (character: string) => (character === " " ? " " : character);

  return {
    span: [
      {
        span: glyph(frontCharacter),
        dataFace: "front",
        style: {
          display: "block",
          backfaceVisibility: "hidden",
          transformOrigin: origin,
          transform: `rotate${axis}(0deg)`,
          transition,
          color: (listener) => themeColor(listener, "shift-11", options.color),
          ...(options.frontStyle ?? {}),
        } as StyleObject,
      },
      {
        span: glyph(flippedCharacter),
        dataFace: "back",
        ariaHidden: "true",
        style: {
          display: "block",
          position: "absolute",
          inset: 0,
          backfaceVisibility: "hidden",
          transformOrigin: origin,
          transform: `rotate${axis}(180deg)`,
          transition,
          color: (listener) => themeColor(listener, "shift-11", options.flippedColor),
          ...(options.flippedStyle ?? {}),
        } as StyleObject,
      },
    ],
    _key: `char-${index}`,
    style: {
      position: "relative",
      display: "inline-block",
      transformStyle: "preserve-3d",
      perspective: themeSpacing(160),
    } as StyleObject,
  };
}

/**
 * A line of heading-sized text whose characters flip 90/180 degrees in 3D
 * around a shared edge on hover, staggered into a wave across the word, to
 * reveal a second phrase (or the same phrase restyled) underneath. Call with
 * no arguments for a working demo — hover the phrase to see it flip.
 */
function text3dFlip(props: Text3dFlipProps = {}): DomphyElement<"h2"> {
  const text = props.children ?? DEFAULT_TEXT;
  const flippedText = props.flippedChildren ?? text;
  const edge = props.edge ?? "top";
  const staggerDelay = props.staggerDelay ?? 50;
  const staggerFrom = props.staggerFrom ?? "start";
  const duration = props.duration ?? 500;
  const easing = props.easing ?? DEFAULT_SPRING_EASING;
  const color = props.color ?? "neutral";
  const flippedColor = props.flippedColor ?? "primary";

  const frontCharacters = Array.from(text);
  const flippedCharacters = Array.from(flippedText);
  const totalCharacters = frontCharacters.length;

  const cellOptions: CharacterCellOptions = {
    edge,
    duration,
    easing,
    staggerDelay,
    staggerFrom,
    color,
    flippedColor,
    frontStyle: props.frontStyle,
    flippedStyle: props.flippedStyle,
  };

  const axis = rotationAxisForEdge(edge);

  return {
    h2: frontCharacters.map((character, index) =>
      characterCell(
        character,
        flippedCharacters[index] ?? " ",
        index,
        totalCharacters,
        cellOptions,
      ),
    ),
    $: [heading({ color })],
    style: {
      fontStyle: "italic",
      overflow: "hidden",
      [`&:hover [data-face="front"]`]: {
        transform: `rotate${axis}(-180deg)`,
      },
      [`&:hover [data-face="back"]`]: {
        transform: `rotate${axis}(0deg)`,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { text3dFlip };
