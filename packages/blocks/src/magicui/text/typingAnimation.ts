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

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

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
  /** Cycles back to the first phrase after the last. Only relevant with multiple phrases. Defaults to `true`. */
  loop?: boolean;
  /** Shows the trailing cursor glyph. Defaults to `true`. */
  showCursor?: boolean;
  /** Blinks the cursor. When `false`, the cursor is shown static (solid). Defaults to `true`. */
  cursorBlink?: boolean;
  /** Cursor glyph shape. Defaults to `"line"`. */
  cursorStyle?: TypingCursorStyle;
  /** Waits until the wrapper scrolls into view before typing starts. Defaults to `false`. */
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
  line: "▏",
  block: "█",
  underscore: "_",
};

function cursorGlyph(cursorStyle: TypingCursorStyle, blink: boolean): DomphyElement<"span"> {
  return {
    span: CURSOR_GLYPH_BY_STYLE[cursorStyle],
    ariaHidden: "true",
    style: {
      display: "inline-block",
      marginInlineStart: themeSpacing(1),
      color: (listener) => themeColor(listener, "shift-9"),
      animation: blink ? `${CURSOR_ANIMATION_NAME} 1s steps(1) infinite` : undefined,
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
  const loop = props.loop ?? true;
  const showCursor = props.showCursor ?? true;
  const cursorBlink = props.cursorBlink ?? true;
  const cursorStyle = props.cursorStyle ?? "line";
  const startOnView = props.startOnView ?? false;
  const wrapperTag = props.as ?? "span";

  const phraseGraphemes = phrases.map((phrase) => toGraphemes(phrase));
  const revealedText = toState("");

  const outerChildren: DomphyElement[] = [
    {
      span: (listener) => revealedText.get(listener),
      _key: "revealed",
      dataTypingRevealed: "true",
      style: { whiteSpace: "pre-wrap" },
    },
    ...(showCursor ? [{ ...cursorGlyph(cursorStyle, cursorBlink), _key: "cursor" }] : []),
  ];

  const outer = {
    [wrapperTag]: outerChildren,
    style: {
      display: "inline-flex",
      alignItems: "center",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let phraseIndex = 0;

      const typeStep = (characterIndex: number) => {
        const graphemes = phraseGraphemes[phraseIndex];
        revealedText.set(graphemes.slice(0, characterIndex).join(""));
        if (characterIndex < graphemes.length) {
          timeoutHandle = setTimeout(() => typeStep(characterIndex + 1), typingSpeed);
          return;
        }
        // Finished typing this phrase. A single phrase (no cycling target)
        // just stops here, cursor still blinking.
        if (phrases.length <= 1) return;
        timeoutHandle = setTimeout(() => deleteStep(graphemes.length), pauseDuration);
      };

      const deleteStep = (characterIndex: number) => {
        const graphemes = phraseGraphemes[phraseIndex];
        revealedText.set(graphemes.slice(0, characterIndex).join(""));
        if (characterIndex > 0) {
          timeoutHandle = setTimeout(() => deleteStep(characterIndex - 1), deletingSpeed);
          return;
        }
        const nextPhraseIndex = (phraseIndex + 1) % phrases.length;
        if (nextPhraseIndex === 0 && !loop) return; // completed the full cycle, don't wrap back
        phraseIndex = nextPhraseIndex;
        timeoutHandle = setTimeout(() => typeStep(0), 0);
      };

      const begin = () => {
        timeoutHandle = setTimeout(() => typeStep(0), startDelay);
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
          { threshold: 0.1 },
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
