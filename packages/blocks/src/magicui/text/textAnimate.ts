// magicui "Text Animate" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Text that
// reveals itself through a staggered per-segment motion, splitting the
// content by character, word, line, or leaving it whole, and animating each
// segment from a hidden keyframe (offset/blurred/scaled) into its resting
// keyframe with a small incremental delay between consecutive segments — the
// same "stagger children" technique used throughout this package's other
// entrance effects (`blurFade`, `terminal`'s fade lines), driven directly by
// the Web Animations API instead of a bundled animation library.
//
// Only `text` is exposed as a `ValueOrState` — passing a `State<string>`
// gives "replay whenever the text content changes" for free: every segment's
// `_key` embeds the current text value, so a text change produces entirely
// new keys, the old segments unmount (playing the reversed-stagger exit) and
// fresh ones mount (playing the entrance stagger) without any extra
// bookkeeping. `by`/`animation`/other props are fixed at construction, same
// as this package's other split-text effects (`spinningText`).

import type { DomphyElement, ElementNode, Listener, StyleObject, ValueOrState } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";

export type TextAnimateBy = "character" | "word" | "line" | "text";

export type TextAnimatePreset =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";

export type TextAnimateTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface TextAnimateProps {
  /** Text content. Pass a `State<string>` for automatic replay when it changes.
   * Defaults to a short demo sentence. */
  text?: ValueOrState<string>;
  /** How the text is split into animated segments. Defaults to `"word"`. */
  by?: TextAnimateBy;
  /** Which hidden→visible keyframe pair each segment animates through. Defaults to `"fadeIn"`. */
  animation?: TextAnimatePreset;
  /** Tween duration per segment, in ms. Defaults to `300`. */
  duration?: number;
  /** Delay before the first segment starts, in ms. Defaults to `0`. */
  delay?: number;
  /** Delay between consecutive segments, in ms. Defaults to `30` for `"character"`,
   * `50` for `"word"`, `60` for `"line"`/`"text"`. */
  staggerDelay?: number;
  /** Waits until the wrapper scrolls into view before starting. Defaults to `false`. */
  startOnView?: boolean;
  /** Once triggered by scrolling into view, never re-triggers on re-entry. Only
   * relevant when `startOnView` is `true`. Defaults to `true`. */
  once?: boolean;
  /** Wrapping element tag. Defaults to `"span"`. */
  as?: TextAnimateTag;
  /** Keeps the full, unsplit text readable to screen readers via a visually-hidden
   * duplicate, marking the animated segments `aria-hidden`. Defaults to `true`. */
  accessibility?: boolean;
  /** Overrides merged onto the computed hidden keyframe. */
  initialStyle?: Record<string, string | number>;
  /** Overrides merged onto the computed visible (resting) keyframe. */
  animateStyle?: Record<string, string | number>;
  /** Overrides merged onto the exit keyframe (defaults to the hidden keyframe). */
  exitStyle?: Record<string, string | number>;
  /** Passthrough style merged onto every segment. */
  segmentStyle?: StyleObject;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

interface TextSegment {
  text: string;
  animate: boolean;
}

const DEFAULT_STAGGER_MS: Record<TextAnimateBy, number> = {
  character: 30,
  word: 50,
  line: 60,
  text: 60,
};

const PRESET_KEYFRAMES: Record<TextAnimatePreset, { hidden: Record<string, string | number>; visible: Record<string, string | number> }> = {
  fadeIn: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  blurIn: { hidden: { opacity: 0, filter: "blur(10px)" }, visible: { opacity: 1, filter: "blur(0px)" } },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", transform: "translateY(8px)" },
    visible: { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
  },
  blurInDown: {
    hidden: { opacity: 0, filter: "blur(10px)", transform: "translateY(-8px)" },
    visible: { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
  },
  slideUp: { hidden: { opacity: 0, transform: "translateY(14px)" }, visible: { opacity: 1, transform: "translateY(0)" } },
  slideDown: { hidden: { opacity: 0, transform: "translateY(-14px)" }, visible: { opacity: 1, transform: "translateY(0)" } },
  slideLeft: { hidden: { opacity: 0, transform: "translateX(14px)" }, visible: { opacity: 1, transform: "translateX(0)" } },
  slideRight: { hidden: { opacity: 0, transform: "translateX(-14px)" }, visible: { opacity: 1, transform: "translateX(0)" } },
  scaleUp: { hidden: { opacity: 0, transform: "scale(0.5)" }, visible: { opacity: 1, transform: "scale(1)" } },
  scaleDown: { hidden: { opacity: 0, transform: "scale(1.5)" }, visible: { opacity: 1, transform: "scale(1)" } },
};

const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

/** Grapheme-safe split so multi-byte characters/emoji stay whole in `"character"` mode. */
function toGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }
  return Array.from(text);
}

function splitIntoSegments(text: string, by: TextAnimateBy): TextSegment[] {
  if (by === "text") return [{ text, animate: true }];
  if (by === "line") return text.split("\n").map((line) => ({ text: line, animate: true }));
  if (by === "character") return toGraphemes(text).map((character) => ({ text: character, animate: true }));
  // "word": keep whitespace runs as their own non-animated segments so spacing
  // between words survives unchanged in the rendered layout.
  const tokens = text.match(/\S+|\s+/g) ?? [];
  return tokens.map((token) => ({ text: token, animate: !/^\s+$/.test(token) }));
}

/**
 * Text that reveals itself segment by segment (character/word/line/whole)
 * with a small stagger delay between consecutive segments, animating from a
 * hidden keyframe (fade/blur/slide/scale) into its resting position. Plays on
 * mount by default, or once scrolled into view when `startOnView` is set.
 * Call with no arguments for a working demo.
 */
function textAnimate(props: TextAnimateProps = {}): DomphyElement {
  const textState = toState(props.text ?? "Domphy renders exactly what you write, nothing more.", "text-animate-text");
  const by = props.by ?? "word";
  const animationPreset = props.animation ?? "fadeIn";
  const durationMs = props.duration ?? 300;
  const startDelayMs = props.delay ?? 0;
  const staggerMs = props.staggerDelay ?? DEFAULT_STAGGER_MS[by];
  const startOnView = props.startOnView ?? false;
  const once = props.once ?? true;
  const wrapperTag = props.as ?? "span";
  const accessibility = props.accessibility ?? true;

  const preset = PRESET_KEYFRAMES[animationPreset] ?? PRESET_KEYFRAMES.fadeIn;
  const hiddenKeyframe = { ...preset.hidden, ...(props.initialStyle ?? {}) };
  const visibleKeyframe = { ...preset.visible, ...(props.animateStyle ?? {}) };
  const exitKeyframe = props.exitStyle ? { ...hiddenKeyframe, ...props.exitStyle } : hiddenKeyframe;

  // Shared, instance-scoped runtime state — persists across reactive
  // re-renders of the segment list (e.g. when `text` is a State and changes).
  const viewState = { hasEntered: !startOnView };
  const segmentPlayers: Array<() => void> = [];

  function buildSegmentElement(segment: TextSegment, index: number, currentText: string, animatedIndex: number, animatedCount: number): DomphyElement<"span"> {
    const key = `${currentText}::${index}`;
    if (!segment.animate) {
      return { span: segment.text, _key: key } as DomphyElement<"span">;
    }
    return {
      span: segment.text,
      _key: key,
      style: {
        display: by === "line" ? "block" : "inline-block",
        willChange: "transform, opacity, filter",
        ...(props.segmentStyle ?? {}),
      } as StyleObject,
      _onMount: (node: ElementNode) => {
        if (typeof window === "undefined") return;
        const element = node.domElement as HTMLElement;
        const enterDelayMs = startDelayMs + animatedIndex * staggerMs;
        const play = () => {
          if (typeof element.animate !== "function") return;
          element.animate([hiddenKeyframe as Keyframe, visibleKeyframe as Keyframe], {
            duration: durationMs,
            delay: enterDelayMs,
            easing: "ease-out",
            fill: "both",
          });
        };
        segmentPlayers.push(play);
        if (viewState.hasEntered) play();
        node.addHook("Remove", () => {
          const playerIndex = segmentPlayers.indexOf(play);
          if (playerIndex !== -1) segmentPlayers.splice(playerIndex, 1);
        });
      },
      _onBeforeRemove: (node: ElementNode, done: () => void) => {
        const element = node.domElement as HTMLElement | null;
        if (!element || typeof element.animate !== "function") {
          done();
          return;
        }
        // Reversed order: the last segment to enter is the first to leave.
        const exitDelayMs = startDelayMs + (animatedCount - 1 - animatedIndex) * staggerMs;
        const animation = element.animate([visibleKeyframe as Keyframe, exitKeyframe as Keyframe], {
          duration: durationMs,
          delay: exitDelayMs,
          easing: "ease-in",
          fill: "both",
        });
        animation.finished.then(() => done(), () => done());
      },
    };
  }

  function buildSegments(currentText: string): DomphyElement[] {
    const rawSegments = splitIntoSegments(currentText, by);
    const animatedCount = rawSegments.filter((segment) => segment.animate).length;
    let animatedRunningIndex = 0;
    return rawSegments.map((segment, index) => {
      if (!segment.animate) return buildSegmentElement(segment, index, currentText, -1, animatedCount);
      const animatedIndex = animatedRunningIndex;
      animatedRunningIndex += 1;
      return buildSegmentElement(segment, index, currentText, animatedIndex, animatedCount);
    });
  }

  const typographyPatch = wrapperTag === "p" ? [paragraph()] : /^h[1-6]$/.test(wrapperTag) ? [heading()] : [];

  const outer = {
    [wrapperTag]: (listener: Listener) => {
      const currentText = textState.get(listener);
      const segmentElements = buildSegments(currentText);
      if (!accessibility) return segmentElements;
      return [
        { span: currentText, _key: "sr-only-text", style: SR_ONLY_STYLE },
        {
          span: segmentElements,
          ariaHidden: "true",
          _key: "segments",
          style: by === "line" ? { display: "block" } : undefined,
        },
      ];
    },
    ...(typographyPatch.length ? { $: typographyPatch } : {}),
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || !startOnView) return;
      if (typeof IntersectionObserver !== "function") {
        // No IntersectionObserver support (e.g. non-browser test runtime) —
        // fail open and play immediately rather than never playing.
        viewState.hasEntered = true;
        for (const play of segmentPlayers) play();
        return;
      }
      const element = node.domElement as Element;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          if (entry.isIntersecting) {
            viewState.hasEntered = true;
            for (const play of segmentPlayers) play();
            if (once) observer.disconnect();
          } else if (!once) {
            viewState.hasEntered = false;
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(element);
      node.addHook("Remove", () => observer.disconnect());
    },
    style: {
      display: by === "line" ? "block" : "inline",
      ...(props.style ?? {}),
    } as StyleObject,
  } as unknown as DomphyElement;

  return outer;
}

export { textAnimate };
