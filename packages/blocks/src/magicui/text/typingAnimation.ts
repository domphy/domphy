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

import type {
  BehaviorInstance,
  DomphyElement,
  ElementNode,
  Listener,
  State,
  StyleObject,
} from "@domphy/core";
import { behavior, hashString, toState } from "@domphy/core";
import { themeColor, themeLetterSpacing } from "@domphy/theme";
import {
  prefersReducedMotion,
  REDUCED_MOTION_PAUSE,
} from "../reducedMotion.js";

export type TypingCursorStyle = "line" | "block" | "underscore";
export type TypingAnimationTag =
  | "span"
  | "div"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

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

const TYPING_ANIMATION_BEHAVIOR_KEY = "magicui-typing-animation";

interface TypingAnimationBehaviorProps {
  revealedText: State<string>;
  cursorVisible: State<boolean>;
  phraseGraphemes: string[][];
  phrases: string[];
  typingSpeed: number;
  deletingSpeed: number;
  pauseDuration: number;
  startDelay: number;
  loop: boolean;
  startOnView: boolean;
  hasMultipleWords: boolean;
}

interface TypingAnimationBehavior
  extends BehaviorInstance<TypingAnimationBehaviorProps> {
  revealedText: State<string>;
  cursorVisible: State<boolean>;
}

function attachTypingAnimation(
  node: ElementNode,
  initialProps: TypingAnimationBehaviorProps,
): TypingAnimationBehavior {
  const revealedText = initialProps.revealedText;
  const cursorVisible = initialProps.cursorVisible;
  let props = initialProps;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let displayed = "";
  let wordIndex = 0;
  let charIndex = 0;
  let phase: "typing" | "pause" | "deleting" = "typing";
  let observer: IntersectionObserver | null = null;

  const step = () => {
    const graphemes = props.phraseGraphemes[wordIndex];
    let changed = false;
    switch (phase) {
      case "typing":
        if (charIndex < graphemes.length) {
          displayed = graphemes.slice(0, charIndex + 1).join("");
          charIndex += 1;
          changed = true;
        } else if (props.hasMultipleWords || props.loop) {
          const isLastWord = wordIndex === props.phrases.length - 1;
          if (!isLastWord || props.loop) {
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
          wordIndex = (wordIndex + 1) % props.phrases.length;
          phase = "typing";
          changed = true;
        }
        break;
    }
    revealedText.set(displayed);
    const activeGraphemes = props.phraseGraphemes[wordIndex];
    const isComplete =
      !props.loop &&
      wordIndex === props.phrases.length - 1 &&
      charIndex >= activeGraphemes.length &&
      phase !== "deleting";
    cursorVisible.set(
      !isComplete &&
        (props.hasMultipleWords ||
          props.loop ||
          charIndex < activeGraphemes.length),
    );
    if (changed) scheduleTick();
  };

  const scheduleTick = () => {
    const timeoutDelay =
      props.startDelay > 0 && displayed === ""
        ? props.startDelay
        : phase === "typing"
          ? props.typingSpeed
          : phase === "deleting"
            ? props.deletingSpeed
            : props.pauseDuration;
    timeoutHandle = setTimeout(step, timeoutDelay);
  };

  const begin = () => {
    // WCAG 2.2.2: the typewriter reveal starts on its own and, with `loop`
    // (or several phrases), types/deletes forever. Under reduce the first
    // phrase is presented already complete and no timer is ever scheduled —
    // the text is the content, so it has to be readable, just not typed out.
    if (prefersReducedMotion()) {
      displayed = props.phraseGraphemes[0].join("");
      charIndex = props.phraseGraphemes[0].length;
      revealedText.set(displayed);
      cursorVisible.set(false);
      return;
    }
    scheduleTick();
  };

  if (typeof window !== "undefined") {
    if (!props.startOnView) {
      begin();
    } else if (typeof IntersectionObserver !== "function") {
      begin();
    } else {
      const element = node.domElement as Element;
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            begin();
            observer?.disconnect();
            observer = null;
          }
        },
        { threshold: 0.3 },
      );
      observer.observe(element);
    }
  }

  return {
    revealedText,
    cursorVisible,
    update(next) {
      props = {
        ...next,
        revealedText,
        cursorVisible,
      };
    },
    destroy() {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      observer?.disconnect();
    },
  };
}

function elementNodeOf(listener: Listener): ElementNode | null {
  const fromListener = (listener as { elementNode?: ElementNode }).elementNode;
  if (fromListener && typeof fromListener.getBehavior === "function") {
    return fromListener;
  }
  if (typeof (listener as unknown as ElementNode).getBehavior === "function") {
    return listener as unknown as ElementNode;
  }
  return null;
}

function typingStates(
  listener: Listener,
  fallbackText: State<string>,
  fallbackCursor: State<boolean>,
): { revealedText: State<string>; cursorVisible: State<boolean> } {
  const instance = elementNodeOf(
    listener,
  )?.getBehavior<TypingAnimationBehavior>(TYPING_ANIMATION_BEHAVIOR_KEY);
  if (instance?.revealedText && instance.cursorVisible) {
    return {
      revealedText: instance.revealedText,
      cursorVisible: instance.cursorVisible,
    };
  }
  return { revealedText: fallbackText, cursorVisible: fallbackCursor };
}

const CURSOR_KEYFRAMES = {
  "0%,49%": { opacity: 1 },
  "50%,100%": { opacity: 0 },
};
const CURSOR_ANIMATION_NAME = `typing-animation-cursor-${hashString(JSON.stringify(CURSOR_KEYFRAMES))}`;

/** Grapheme-safe split so multi-byte characters/emoji don't break mid-glyph. */
function toGraphemes(text: string): string[] {
  if (
    typeof Intl !== "undefined" &&
    typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function"
  ) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
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

function cursorGlyph(
  cursorStyle: TypingCursorStyle,
  blink: boolean,
  visible: State<boolean>,
  revealedText: State<string>,
): DomphyElement<"span"> {
  return {
    span: CURSOR_GLYPH_BY_STYLE[cursorStyle],
    ariaHidden: "true",
    style: {
      display: (listener: Listener) =>
        typingStates(listener, revealedText, visible).cursorVisible.get(
          listener,
        )
          ? "inline-block"
          : "none",
      color: (listener) => themeColor(listener, "shift-9"),
      animation: blink
        ? `${CURSOR_ANIMATION_NAME} 1.2s step-end infinite`
        : undefined,
      // Needed even though `begin()`'s reduce branch hides the caret: with
      // the default `startOnView`, `begin()` does not run until the block
      // scrolls into view, so until then the caret blinks on forever. The CSS
      // pause covers exactly that window and is a no-op afterwards (the glyph
      // is `display: none` once `begin()` has set `cursorVisible` false).
      // Measured: without it, an off-screen typingAnimation reports one
      // running CSS animation under `prefers-reduced-motion: reduce`.
      ...(blink ? REDUCED_MOTION_PAUSE : {}),
      [`@keyframes ${CURSOR_ANIMATION_NAME}`]: blink
        ? CURSOR_KEYFRAMES
        : undefined,
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
  const requestedPhrases = props.text
    ? Array.isArray(props.text)
      ? props.text
      : [props.text]
    : ["Build with Domphy.", "No JSX. No virtual DOM.", "Just plain objects."];
  // `text: []` would leave `phraseGraphemes[0]` undefined, which the typing
  // engine dereferences unconditionally (`graphemes.length` in `step`, and the
  // reduced-motion branch of `begin`). One empty phrase types nothing and
  // leaves the cursor blinking instead of throwing.
  const phrases = requestedPhrases.length > 0 ? requestedPhrases : [""];
  const typingSpeed = props.typingSpeed ?? 100;
  const deletingSpeed =
    props.deletingSpeed ?? Math.max(1, Math.round(typingSpeed / 2));
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
      span: (listener: Listener) =>
        typingStates(listener, revealedText, cursorVisible).revealedText.get(
          listener,
        ),
      _key: "revealed",
      dataTypingRevealed: "true",
    },
    ...(showCursor
      ? [
          {
            ...cursorGlyph(
              cursorStyle,
              cursorBlink,
              cursorVisible,
              revealedText,
            ),
            _key: "cursor",
          },
        ]
      : []),
  ];

  const hasMultipleWords = phrases.length > 1;

  const outer = {
    [wrapperTag]: outerChildren,
    style: {
      // Upstream pairs `leading-20` (5rem = 80px) with `text-4xl` (2.25rem =
      // 36px) on the SAME element — a ratio of 2.22. This port never sets a
      // font-size, so a literal 5rem leading was left unanchored: at the
      // ambient 1rem it produced an 80px line box around 16px text (5x, a
      // visible band of dead space, screenshotted before this change). The
      // unitless multiplier reproduces upstream's ratio at every size —
      // 2.2 x 2.25rem = 79.2px, within 1% of upstream's 80px where upstream's
      // own size is used — and stays sane when the caller sizes it otherwise.
      lineHeight: 2.2,
      // Upstream's arbitrary `tracking-[-0.02em]` rounded onto the theme's
      // nearest step, `tight` (-0.025em): 0.005em/character, i.e. 0.18px at
      // upstream's own 2.25rem reference size — below the 1px the effect can
      // paint, and worth it to keep the tracking themeable.
      letterSpacing: themeLetterSpacing("tight"),
      ...(wrapperTag === "span" ? { display: "inline-block" } : {}),
      ...(props.style ?? {}),
    } as StyleObject,
    ...behavior<TypingAnimationBehaviorProps>(
      TYPING_ANIMATION_BEHAVIOR_KEY,
      attachTypingAnimation,
      {
        revealedText,
        cursorVisible,
        phraseGraphemes,
        phrases,
        typingSpeed,
        deletingSpeed,
        pauseDuration,
        startDelay,
        loop,
        startOnView,
        hasMultipleWords,
      },
    ),
  } as unknown as DomphyElement;

  return outer;
}

export { typingAnimation };
