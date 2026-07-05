// magicui "Word Rotate" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A single
// line of large, bold text that automatically cycles through a fixed list
// of words on a timer: the current word slides down and fades out while the
// next word slides in from above and fades in, at the same position, so
// surrounding layout never jumps. Fully automatic and looping — no
// interaction required.
//
// Structurally this is the same "single-item reactive keyed list" state
// machine `morphingText` uses in this file (replacing the one-item array on
// each tick lets the reconciler run the outgoing word's exit and the
// incoming word's enter at once), swapped from a gooey blur crossfade to a
// plain vertical slide-and-fade via `motion()`'s `initial`/`animate`/`exit`
// keyframes — an odometer/ticker-style word swap rather than a liquid morph.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { motion } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

export interface WordRotateTransition {
  /** Milliseconds the slide/fade crossfade itself takes. Defaults to `250`. */
  duration?: number;
  /** CSS easing for the crossfade. Defaults to `"ease-out"`. */
  easing?: string;
}

export interface WordRotateProps {
  /** Words/phrases cycled through in order, looping back to the first. Defaults to a short demo list. */
  words?: string[];
  /** Milliseconds each word stays visible before switching to the next. Defaults to `2500`. */
  duration?: number;
  /** Theme color for the word text. Defaults to `"neutral"` (theme foreground, flips light/dark automatically). */
  color?: ThemeColor;
  /** Escape hatch for the enter/exit crossfade's own timing/easing. See {@link WordRotateTransition}. */
  transition?: WordRotateTransition;
  /** Passthrough style merged onto the outer fixed-line container. */
  style?: StyleObject;
}

interface WordEntry {
  key: string;
  text: string;
}

const DEFAULT_WORDS = ["better", "faster", "modern", "reactive"];
// Vertical travel distance for the enter/exit slide, in em — scales with the
// word's own font size rather than a fixed pixel offset.
const SLIDE_DISTANCE_EM = 0.5;

function wordLayer(
  entry: WordEntry,
  color: ThemeColor,
  transitionDurationMs: number,
  easing: string,
): DomphyElement<"span"> {
  return {
    span: entry.text,
    _key: entry.key,
    style: {
      position: "absolute",
      insetInlineStart: 0,
      insetBlockStart: 0,
      whiteSpace: "nowrap",
      fontSize: (listener: Listener) => themeSize(listener, "increase-4"),
      fontWeight: () => "800",
      color: (listener: Listener) => themeColor(listener, "shift-11", color),
    },
    $: [
      motion({
        initial: { opacity: 0, y: `-${SLIDE_DISTANCE_EM}em` },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: `${SLIDE_DISTANCE_EM}em` },
        transition: { duration: transitionDurationMs, easing },
      }),
    ],
  };
}

/**
 * A single line of large, bold text that automatically and endlessly cycles
 * through a word list, sliding/fading the outgoing word out and the
 * incoming word in at the same fixed position. No interaction required.
 * Call with no arguments for a working demo cycling through a short word list.
 */
function wordRotate(props: WordRotateProps = {}): DomphyElement<"span"> {
  const words = props.words && props.words.length > 0 ? props.words : DEFAULT_WORDS;
  const holdDuration = props.duration ?? 2500;
  const color = props.color ?? "neutral";
  const transitionDurationMs = props.transition?.duration ?? 250;
  const easing = props.transition?.easing ?? "ease-out";

  const layers = toState<WordEntry[]>([{ key: "word-0", text: words[0] }]);
  let wordIndex = 0;
  let insertCount = 0;

  const advance = () => {
    if (words.length <= 1) return;
    wordIndex = (wordIndex + 1) % words.length;
    insertCount += 1;
    layers.set([{ key: `word-${insertCount}`, text: words[wordIndex] }]);
  };

  return {
    span: [
      {
        span: (listener: Listener) =>
          layers.get(listener).map((entry) => wordLayer(entry, color, transitionDurationMs, easing)),
        // `position: absolute` + `inset: 0` fills the outer wrapper exactly.
        // This span's own children are all `position: absolute` (so the
        // outgoing/incoming word can overlap mid-crossfade), which collapses
        // ITS box to 0x0. A 0x0 `display: inline-block` sibling defaults to
        // `vertical-align: baseline`, which — per the CSS spec's rule for an
        // empty inline-block's baseline being its bottom margin edge —
        // shoves the whole 0x0 box down near the surrounding text baseline
        // instead of the top, dragging every absolutely-positioned word
        // layer down with it and off the bottom of the outer wrapper's
        // visible box. Filling the parent via `inset: 0` sidesteps inline
        // baseline alignment entirely.
        style: { position: "absolute", inset: 0 },
      },
    ],
    style: {
      position: "relative",
      display: "inline-block",
      // Must match the word layer's own font-size (below). The crossfading
      // words are positioned `absolute` (so outgoing/incoming can overlap
      // mid-transition), which means they contribute zero natural height to
      // this wrapper — `minHeight: 1.2em` is what actually reserves visible
      // space for them. If this element's own font-size stayed at the
      // inherited ambient size instead of the word's real (larger) size,
      // that `1.2em` would resolve far too small, the wrapper would
      // collapse to near-zero height, and the word would render entirely
      // outside any scrollable ancestor's visible viewport.
      fontSize: (listener: Listener) => themeSize(listener, "increase-4"),
      fontWeight: () => "800",
      color: (listener: Listener) => themeColor(listener, "shift-11", color),
      minHeight: "1.2em",
      minWidth: "1ch",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || words.length <= 1) return;
      const timer = window.setInterval(advance, holdDuration);
      node.addHook("Remove", () => window.clearInterval(timer));
    },
  } as DomphyElement<"span">;
}

export { wordRotate };
