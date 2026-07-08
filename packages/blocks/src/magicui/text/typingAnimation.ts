// magicui "Typing Animation" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A classic
// typewriter effect: one grapheme revealed per tick via a chained `setTimeout`
// (a discrete step animation, not eased — each frame is one whole character),
// with a trailing cursor glyph that blinks via a looping CSS opacity keyframe.
// Given a list of phrases instead of one string, it types a phrase, pauses,
// deletes it (faster than it typed), then types the next, cycling forever
// when `loop` is set — the same chained-timeout technique this package's
// `terminal()` block uses for its own typed command lines, generalized to
// support delete/cycle through multiple phrases.

import type { DomphyElement, ElementNode, State, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { themeColor } from "@domphy/theme";

export type TypingCursorStyle = "line" | "block" | "underscore";
export type TypingAnimationTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface TypingAnimationProps {
  /** Text to type, or a list of phrases to cycle through. Defaults to a short demo phrase. */
  text?: string | string[];
  /** ms per character while typing. Defaults to `100`. */
  typingSpeed?: number;
  /** ms per character while deleting. Defaults to roughly twice as fast as typing (`typingSpeed / 2`). */
  deletingSpeed?: number;
  /** ms a fully-typed phrase is held before deleting starts. Only relevant with multiple phrases. Defaults to `1000`. */
  pauseDuration?: number;
  /** ms before the very first character types. Defaults to `0`. */
  startDelay?: number;
  /** Cycles back to the first phrase after the last. Only relevant with multiple phrases. Defaults to `false`. */
  loop?: boolean;
  /** Shows the trailing cursor glyph. Defaults to `true`. */
  showCursor?: boolean;
  /** Blinks the cursor. When `false`, the cursor is shown static (solid). Defaults to `true`. */
  cursorBlink?: boolean;
  /** Cursor glyph shape. Defaults to `"line"`. */
  cursorStyle?: TypingCursorStyle;
  /** Waits until the wrapper scrolls into view before typing starts. Defaults to `true`. */
  startOnView?: boolean;
  /** Wrapping element tag. Defaults to `"span"`. */
  as?: TypingAnimationTag;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

const CURSOR_KEYFRAMES = { "0%,49%": { opacity: 1 }, "50%,100%": { opacity: 0 } };
const CURSOR_ANIMATION_NAME = `typing-animation-cursor-${hashString(JSON.stringify(CURSOR_KEYFRAMES))}`;

/** Grapheme-safe split so multi-byte characters/emoji don't break mid-glyph. */
function toGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }
  return Array.from(text);
}

// A solid-fill text glyph (not a `backgroundColor` box) so its fixed-shift
// tone reads as a text-color glyph rather than a hardcoded surface — same
// idiom as this package's `terminal()` block uses for its own cursor/traffic
// lights, and keeps the glyph's height matched to the surrounding text size
// for free (inherited font-size, no literal width/height needed).
const CURSOR_GLYPH_BY_STYLE: Record<TypingCursorStyle, string> = {
  line: "|",
  block: "▌",
  underscore: "_",
};

function cursorGlyph(cursorStyle: TypingCursorStyle, blink: boolean, visible: State<boolean>): DomphyElement<"span"> {
  return {
    span: CURSOR_GLYPH_BY_STYLE[cursorStyle],
    ariaHidden: "true",
    style: {
      display: (listener) => (visible.get(listener) ? "inline-block" : "none"),
      color: (listener) => themeColor(listener, "shift-9"),
      animation: blink ? `${CURSOR_ANIMATION_NAME} 1.2s step-end infinite` : undefined,
      [`@keyframes ${CURSOR_ANIMATION_NAME}`]: blink ? CURSOR_KEYFRAMES : undefined,
    } as StyleObject,
  } as DomphyElement<"span">;
}

/**
 * Classic typewriter reveal: text appears one character at a time with an
 * optional blinking cursor, or cycles through a list of phrases (type, pause,
 * delete, next) indefinitely when `loop` is set. Call with no arguments for a
 * working demo.
 */
function typingAnimation(props: TypingAnimationProps = {}): DomphyElement {
  const phrases = props.text
    ? Array.isArray(props.text)
      ? props.text
      : [props.text]
    : ["Build with Domphy.", "No JSX. No virtual DOM.", "Just plain objects."];
  const typingSpeed = props.typingSpeed ?? 100;
  const deletingSpeed = props.deletingSpeed ?? Math.max(1, Math.round(typingSpeed / 2));
  const pauseDuration = props.pauseDuration ?? 1000;
  const startDelay = props.startDelay ?? 0;
  const loop = props.loop ?? false;
  const showCursor = props.showCursor ?? true;
  const cursorBlink = props.cursorBlink ?? true;
  const cursorStyle = props.cursorStyle ?? "line";
  const startOnView = props.startOnView ?? true;
  const wrapperTag = props.as ?? "span";

  const phraseGraphemes = phrases.map((phrase) => toGraphemes(phrase));
  const revealedText = toState("");
  const cursorVisible = toState(true);

  const outerChildren: DomphyElement[] = [
    {
      span: (listener) => revealedText.get(listener),
      _key: "revealed",
      dataTypingRevealed: "true",
    },
    ...(showCursor ? [{ ...cursorGlyph(cursorStyle, cursorBlink, cursorVisible), _key: "cursor" }] : []),
  ];

  const hasMultipleWords = phrases.length > 1;

  const outer = {
    [wrapperTag]: outerChildren,
    style: {
      // Upstream always applies `leading-20` (line-height 5rem) and
      // `tracking-[-0.02em]`, plus `inline-block` only when `as === "span"`
      // (block/inline tags keep their native display). Passthrough style wins.
      lineHeight: "5rem",
      letterSpacing: "-0.02em",
      ...(wrapperTag === "span" ? { display: "inline-block" } : {}),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      // Direct translation of upstream's `phase`/index state machine so the
      // timing matches exactly: the per-step delay is computed BEFORE each
      // transition from the (possibly empty) currently-displayed text, so
      // `startDelay` re-applies before the first character of every new word
      // and a finished word is held for `typingSpeed + pauseDuration`.
      let displayed = "";
      let wordIndex = 0;
      let charIndex = 0;
      let phase: "typing" | "pause" | "deleting" = "typing";

      const step = () => {
        const graphemes = phraseGraphemes[wordIndex];
        let changed = false;
        switch (phase) {
          case "typing":
            if (charIndex < graphemes.length) {
              displayed = graphemes.slice(0, charIndex + 1).join("");
              charIndex += 1;
              changed = true;
            } else if (hasMultipleWords || loop) {
              const isLastWord = wordIndex === phrases.length - 1;
              if (!isLastWord || loop) {
                phase = "pause";
                changed = true;
              }
            }
            break;
          case "pause":
            phase = "deleting";
            changed = true;
            break;
          case "deleting":
            if (charIndex > 0) {
              displayed = graphemes.slice(0, charIndex - 1).join("");
              charIndex -= 1;
              changed = true;
            } else {
              wordIndex = (wordIndex + 1) % phrases.length;
              phase = "typing";
              changed = true;
            }
            break;
        }
        revealedText.set(displayed);
        // Mirror upstream `shouldShowCursor` (its `showCursor` gate is handled
        // when the cursor element is built): hide once the last word is fully
        // typed with no loop, otherwise keep it visible.
        const activeGraphemes = phraseGraphemes[wordIndex];
        const isComplete =
          !loop &&
          wordIndex === phrases.length - 1 &&
          charIndex >= activeGraphemes.length &&
          phase !== "deleting";
        cursorVisible.set(
          !isComplete && (hasMultipleWords || loop || charIndex < activeGraphemes.length),
        );
        // No transition means the terminal freeze (single/last word done, no
        // loop) — stop scheduling, matching upstream's effect no longer re-running.
        if (changed) scheduleTick();
      };

      const scheduleTick = () => {
        const timeoutDelay =
          startDelay > 0 && displayed === ""
            ? startDelay
            : phase === "typing"
              ? typingSpeed
              : phase === "deleting"
                ? deletingSpeed
                : pauseDuration;
        timeoutHandle = setTimeout(step, timeoutDelay);
      };

      const begin = () => {
        scheduleTick();
      };

      if (!startOnView) {
        begin();
      } else if (typeof IntersectionObserver !== "function") {
        // No IntersectionObserver support (e.g. non-browser test runtime) —
        // fail open and start immediately rather than never playing.
        begin();
      } else {
        const element = node.domElement as Element;
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              begin();
              observer.disconnect();
            }
          },
          { threshold: 0.3 },
        );
        observer.observe(element);
        node.addHook("Remove", () => observer.disconnect());
      }

      node.addHook("Remove", () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      });
    },
  } as unknown as DomphyElement;

  return outer;
}

export { typingAnimation };
