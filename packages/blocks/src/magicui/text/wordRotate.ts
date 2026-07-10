// magicui "Word Rotate" — direct port of the upstream React component
// (reference/magicui/apps/www/registry/magicui/word-rotate.tsx). A single line
// of large, bold heading text that automatically cycles through a fixed word
// list on a timer: each swap slides+fades the current word DOWN and out, then
// (once it has fully left) slides+fades the next word IN from above, at the
// same position.
//
// Upstream wraps the word in `<AnimatePresence mode="wait">`, so the outgoing
// word's exit runs to completion BEFORE the incoming word's enter begins
// (sequential, ~0.25s exit + ~0.25s enter = ~0.5s per swap, with a brief empty
// beat). We reproduce that here by driving the reactive one-item list in two
// phases: first clear it to `[]` (which plays the current word's `motion` exit
// via `_onBeforeRemove`, keeping the exiting node mounted until its animation
// finishes), then — after the exit duration — set the next word (which plays
// its enter). This is deliberately NOT a concurrent crossfade.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import { toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";
import { motion } from "@domphy/ui";

export interface WordRotateTransition {
  /** Milliseconds the slide/fade itself takes. Defaults to `250` (upstream 0.25s). */
  duration?: number;
  /** CSS easing for the slide/fade. Defaults to `"ease-out"` (upstream `easeOut`). */
  easing?: string;
}

export interface WordRotateProps {
  /** Words/phrases cycled through in order, looping back to the first. Defaults to a short demo list. */
  words?: string[];
  /** Milliseconds each word stays visible before switching to the next. Defaults to `2500`. */
  duration?: number;
  /** Theme color for the word text. Defaults to `"neutral"` (theme foreground, flips light/dark automatically). */
  color?: ThemeColor;
  /** Escape hatch for the enter/exit slide's own timing/easing. See {@link WordRotateTransition}. */
  transition?: WordRotateTransition;
  /** Passthrough style merged onto the outer block container. */
  style?: StyleObject;
}

interface WordEntry {
  key: string;
  text: string;
}

const DEFAULT_WORDS = ["better", "faster", "modern", "reactive"];
// Upstream's fixed vertical travel for the enter (y:-50) / exit (y:+50) slide,
// in px — a `motion` numeric `y` becomes `translateY(<n>px)`.
const SLIDE_DISTANCE_PX = 50;

function wordLayer(
  entry: WordEntry,
  color: ThemeColor,
  transitionDurationMs: number,
  easing: string,
): DomphyElement<"h1"> {
  return {
    h1: entry.text,
    _key: entry.key,
    style: {
      // Tailwind's preflight zeroes heading margins; match it so the h1 does
      // not inject browser-default block margin around the rotating word.
      margin: 0,
      whiteSpace: "nowrap",
      fontSize: (listener: Listener) => themeSize(listener, "increase-4"),
      fontWeight: () => "800",
      color: (listener: Listener) => themeColor(listener, "shift-11", color),
    },
    $: [
      motion({
        initial: { opacity: 0, y: -SLIDE_DISTANCE_PX },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: SLIDE_DISTANCE_PX },
        transition: { duration: transitionDurationMs, easing },
      }),
    ],
  };
}

/**
 * A single line of large, bold heading text that automatically and endlessly
 * cycles through a word list. Each swap slides/fades the outgoing word out and,
 * once it has fully left, slides/fades the incoming word in at the same
 * position (upstream's `AnimatePresence mode="wait"` behavior). No interaction
 * required. Call with no arguments for a working demo cycling a short list.
 */
function wordRotate(props: WordRotateProps = {}): DomphyElement<"div"> {
  const words =
    props.words && props.words.length > 0 ? props.words : DEFAULT_WORDS;
  const holdDuration = props.duration ?? 2500;
  const color = props.color ?? "neutral";
  const transitionDurationMs = props.transition?.duration ?? 250;
  const easing = props.transition?.easing ?? "ease-out";

  const layers = toState<WordEntry[]>([{ key: "word-0", text: words[0] }]);
  let wordIndex = 0;
  let insertCount = 0;
  let swapTimer = 0;

  // Two-phase swap = `mode="wait"`: clear the list so the current word plays
  // its exit (its node stays mounted until the exit animation finishes), then
  // after the exit duration mount the next word so it plays its enter.
  const advance = () => {
    if (words.length <= 1) return;
    layers.set([]);
    swapTimer = window.setTimeout(() => {
      wordIndex = (wordIndex + 1) % words.length;
      insertCount += 1;
      layers.set([{ key: `word-${insertCount}`, text: words[wordIndex] }]);
    }, transitionDurationMs);
  };

  return {
    // Reactive one-item (or empty, mid-swap) keyed list of the current word.
    div: (listener: Listener) =>
      layers
        .get(listener)
        .map((entry) => wordLayer(entry, color, transitionDurationMs, easing)),
    // Upstream outer `<div className="overflow-hidden py-2">`: block-level,
    // clips the slide, and the 0.5rem block padding gives the sliding word
    // clearance top and bottom inside the clip. The exiting/entering h1 stays
    // mounted throughout its animation, so the block never collapses mid-swap.
    //
    // paddingTop/paddingBottom stay upstream's literal 0.5rem (root-relative)
    // rather than themeSpacing(2) (0.5em, relative to THIS element's own
    // font-size) — this block can be embedded anywhere, and an em-based
    // padding would track whatever ambient font-size it lands in instead of
    // upstream's constant 8px clip clearance, breaking pixel fidelity.
    _doctorDisable: "raw-spacing-value",
    style: {
      overflow: "hidden",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || words.length <= 1) return;
      const timer = window.setInterval(advance, holdDuration);
      node.addHook("Remove", () => {
        window.clearInterval(timer);
        window.clearTimeout(swapTimer);
      });
    },
  } as DomphyElement<"div">;
}

export { wordRotate };
