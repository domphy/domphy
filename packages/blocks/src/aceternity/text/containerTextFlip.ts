// Aceternity UI "Container Text Flip" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). An
// inline word-flip effect: a small bordered pill/badge sits inside a larger
// headline sentence and cycles through a list of words, smoothly resizing
// its own width to hug each new word while the outgoing word's letters
// fade/slide out and the incoming word's letters fade/slide in with a small
// per-character stagger — a rolling reveal rather than an instant swap.
//
// Distinct from this file's sibling `layoutTextFlip.ts` (which crossfades
// the WHOLE outgoing/incoming word as a single unit): here every glyph is
// its own keyed `<span>`, each with its own `motion()` instance whose
// `transition.delay = index * staggerMs` — so the reveal visibly ripples
// left-to-right across the word instead of fading in as one block, per this
// component's own domSketch ("row of per-character spans... individually
// mounted/unmounted"). To keep the outgoing and incoming WORDS perfectly
// overlapping while their own letters animate independently (rather than
// the old word's tail letters briefly sitting in normal flow next to the
// new word's lead letters), each word is still wrapped in one
// `position:absolute; inset:0` layer — the same "wholesale-replace a single
// reactive list entry" technique `layoutTextFlip.ts`'s own `wordLayer()`
// uses — just with an array of per-character children inside it instead of
// one text node.
//
// The badge's own width tween reuses `layoutTextFlip`'s measured-width
// technique verbatim: an offscreen `canvas.measureText()` call (using the
// badge's own resolved font, read once via `getComputedStyle` on mount)
// drives a reactive `MotionKeyframe` State fed into a `motion()` instance on
// the badge itself, so the Web Animations API always tweens FROM the
// badge's current rendered width with no extra bookkeeping.
//
// FIDELITY NOTE (per the task's own researchNote): the upstream docs page
// only exposed the props table, not the rendered demo's computed styling —
// the badge surface below (edge-anchored `dataTone` chip, border, shadow,
// "a light neutral surface distinct from the page background") is this
// implementation's own reasonable design choice, not a confirmed 1:1 visual
// match.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { motion, paragraph } from "@domphy/ui";
import type { MotionKeyframe } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export interface ContainerTextFlipProps {
  /** Words cycled through inside the badge, looping back to the first. Defaults to a short demo list. */
  words?: string[];
  /** Milliseconds each word is held before advancing to the next. Defaults to `3000`. */
  interval?: number;
  /** Milliseconds for the badge's width tween AND the per-character letter transition (kept as one
   * shared knob, per the spec's own "separately configurable from the hold interval" framing —
   * separate from `interval`, shared between width and letters). Defaults to `700`. */
  animationDuration?: number;
  /** Index into `words` shown first, before the first scheduled advance. Defaults to `0`. */
  startIndex?: number;
  /** Theme color family for the badge's own elevated surface. Defaults to `"neutral"`. */
  badgeColor?: ThemeColor;
  /** Extra class name merged onto the badge wrapper's native `class` attribute. */
  className?: string;
  /** Extra class name merged onto each character span's native `class` attribute. */
  textClassName?: string;
  /** Passthrough style merged onto the badge wrapper. */
  style?: StyleObject;
}

interface WordEntry {
  key: string;
  word: string;
}

const DEFAULT_WORDS = ["faster", "cleaner", "smarter", "sharper"];
const HORIZONTAL_PADDING_UNITS = 3;
const SLIDE_DISTANCE_EM = 0.3;
const PER_CHARACTER_STAGGER_RATIO = 0.12; // fraction of animationDuration between adjacent characters' start
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

let containerTextFlipInstanceCounter = 0;

function characterLayer(
  char: string,
  index: number,
  wordKey: string,
  staggerMs: number,
  transitionDurationMs: number,
  textClassName?: string,
): DomphyElement<"span"> {
  return {
    span: char === " " ? " " : char,
    _key: `${wordKey}-${index}`,
    class: textClassName,
    style: { position: "relative", display: "inline-block", whiteSpace: "pre" } as StyleObject,
    $: [
      motion({
        initial: { opacity: 0, y: `${SLIDE_DISTANCE_EM}em` },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: `-${SLIDE_DISTANCE_EM}em` },
        transition: { duration: transitionDurationMs, delay: index * staggerMs, easing: EASE_OUT_EXPO },
      }),
    ],
  };
}

function wordLayer(entry: WordEntry, staggerMs: number, transitionDurationMs: number, textClassName?: string): DomphyElement<"span"> {
  const characters = Array.from(entry.word);
  return {
    span: characters.map((char, index) => characterLayer(char, index, entry.key, staggerMs, transitionDurationMs, textClassName)),
    _key: entry.key,
    style: {
      position: "absolute",
      inset: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
    } as StyleObject,
  };
}

/**
 * An inline word-flip badge: a small bordered pill cycles through a list of
 * words, smoothly resizing to hug each new word while its letters fade/slide
 * in and out with a per-character stagger, sitting inline inside a short
 * headline sentence. Call with no arguments for a working demo.
 */
function containerTextFlip(props: ContainerTextFlipProps = {}): DomphyElement<"p"> {
  const words = props.words && props.words.length > 0 ? props.words : DEFAULT_WORDS;
  const holdIntervalMs = Math.max(200, props.interval ?? 3000);
  const transitionDurationMs = Math.max(50, props.animationDuration ?? 700);
  const startIndex = (((props.startIndex ?? 0) % words.length) + words.length) % words.length;
  const badgeColor = props.badgeColor ?? "neutral";
  const staggerMs = transitionDurationMs * PER_CHARACTER_STAGGER_RATIO;

  const instanceId = ++containerTextFlipInstanceCounter;
  let wordIndex = startIndex;
  let insertCount = 0;

  const wordEntries = toState<WordEntry[]>([{ key: `word-${instanceId}-0`, word: words[wordIndex] }]);
  const badgeWidth = toState<MotionKeyframe>({});

  let measureWordWidth: ((word: string) => number) | null = null;
  let horizontalPaddingPx = 0;

  function targetWidthPx(word: string): number {
    const measuredWidth = measureWordWidth ? measureWordWidth(word) : word.length * 9;
    return Math.ceil(measuredWidth + horizontalPaddingPx * 2);
  }

  const advance = () => {
    if (words.length <= 1) return;
    wordIndex = (wordIndex + 1) % words.length;
    insertCount += 1;
    const nextWord = words[wordIndex];
    wordEntries.set([{ key: `word-${instanceId}-${insertCount}`, word: nextWord }]);
    badgeWidth.set({ width: `${targetWidthPx(nextWord)}px` });
  };

  const badgeElement: DomphyElement<"span"> = {
    span: [
      {
        span: (listener: Listener) => wordEntries.get(listener).map((entry) => wordLayer(entry, staggerMs, transitionDurationMs, props.textClassName)),
        style: { position: "relative", display: "inline-block", minHeight: "1.15em", minWidth: "1ch" } as StyleObject,
      },
    ],
    class: props.className,
    // Edge-anchored dataTone chip surface — a small elevated pill, distinct
    // from (but close to) the page background, this package's standard
    // convention for this shape (see `layoutTextFlip.ts`'s own badge).
    dataTone: "shift-2",
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      verticalAlign: "middle",
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * HORIZONTAL_PADDING_UNITS),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3", badgeColor)}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(2)} ${themeColor(listener, "shift-3", badgeColor)}`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", badgeColor),
      color: (listener: Listener) => themeColor(listener, "shift-11", badgeColor),
      ...(props.style ?? {}),
    } as StyleObject,
    $: [motion({ animate: badgeWidth, transition: { duration: transitionDurationMs, easing: EASE_OUT_EXPO } })],
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const badgeDomElement = node.domElement as HTMLElement;
      const computedStyle = window.getComputedStyle(badgeDomElement);
      horizontalPaddingPx = (parseFloat(computedStyle.paddingLeft) || 0) + (parseFloat(computedStyle.paddingRight) || 0);

      const measureCanvas = document.createElement("canvas");
      const context = measureCanvas.getContext("2d");
      if (context) {
        context.font = `${computedStyle.fontWeight || "700"} ${computedStyle.fontSize || "16px"} ${computedStyle.fontFamily || "sans-serif"}`;
        measureWordWidth = (word: string) => context.measureText(word).width;
      }

      // Size the first word directly (no animation) so there is no layout
      // jump before the first scheduled swap.
      badgeDomElement.style.width = `${targetWidthPx(words[wordIndex])}px`;
    },
    _onRemove: () => {
      measureWordWidth = null;
    },
  };

  return {
    p: ["Ship your product ", badgeElement, "."],
    $: [paragraph()],
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || words.length <= 1) return;
      const timer = window.setInterval(advance, holdIntervalMs);
      node.addHook("Remove", () => window.clearInterval(timer));
    },
  } as DomphyElement<"p">;
}

export { containerTextFlip };
