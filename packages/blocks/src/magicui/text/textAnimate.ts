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
// Stagger model matches upstream: the whole reveal always spans the same time
// window (`duration`, default 300ms) regardless of how many segments there
// are, so the inter-segment delay is `duration / segments.length` — long
// strings reveal just as fast as short ones. Each segment's own tween is a
// fixed 300ms (upstream hard-codes `duration: 0.3` in every variant and uses
// the `duration` prop only to size the stagger window).
//
// Only `text` is exposed as a `ValueOrState` — passing a `State<string>`
// gives "replay whenever the text content changes" for free: every segment's
// `_key` embeds the current text value, so a text change produces entirely
// new keys, the old segments unmount (playing the reversed-stagger exit) and
// fresh ones mount (playing the entrance stagger) without any extra
// bookkeeping. `by`/`animation`/other props are fixed at construction, same
// as this package's other split-text effects (`spinningText`).

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
  ValueOrState,
} from "@domphy/core";
import { toState } from "@domphy/core";

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

export type TextAnimateTag =
  | "span"
  | "div"
  | "p"
  | "article"
  | "section"
  | "li"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

export interface TextAnimateProps {
  /** Text content. Pass a `State<string>` for automatic replay when it changes.
   * Defaults to a short demo sentence. */
  text?: ValueOrState<string>;
  /** How the text is split into animated segments. Defaults to `"word"`. */
  by?: TextAnimateBy;
  /** Which hidden→visible keyframe pair each segment animates through. Defaults to `"fadeIn"`. */
  animation?: TextAnimatePreset;
  /** Total time window the whole staggered reveal is spread across, in ms
   * (matching upstream's `duration`): the inter-segment delay is
   * `duration / segments.length`. Each segment's own tween is a fixed 300ms.
   * Defaults to `300`. */
  duration?: number;
  /** Delay before the first segment starts, in ms. Defaults to `0`. */
  delay?: number;
  /** Waits until the wrapper scrolls into view before starting. Defaults to `true`. */
  startOnView?: boolean;
  /** Once triggered by scrolling into view, never re-triggers on re-entry. Only
   * relevant when `startOnView` is `true`. Defaults to `false`. */
  once?: boolean;
  /** Wrapping element tag. Defaults to `"p"`. */
  as?: TextAnimateTag;
  /** Keeps the full, unsplit text readable to screen readers via a visually-hidden
   * duplicate plus an `aria-label` on the wrapper, marking the animated segments
   * `aria-hidden`. Defaults to `true`. */
  accessibility?: boolean;
  /** Overrides merged onto the computed hidden keyframe. */
  initialStyle?: Record<string, string | number>;
  /** Overrides merged onto the computed visible (resting) keyframe. */
  animateStyle?: Record<string, string | number>;
  /** Overrides merged onto the exit keyframe (defaults to the preset's own exit
   * keyframe if it has one, otherwise the hidden keyframe). */
  exitStyle?: Record<string, string | number>;
  /** Passthrough style merged onto every segment. */
  segmentStyle?: StyleObject;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

// Every segment animates in upstream — including word-mode whitespace runs,
// which are split out by `children.split(/(\s+)/)` and rendered as their own
// `motion.span` (so they count toward `segments.length` and the stagger).
const SEGMENT_TWEEN_MS = 300;

// Upstream item tweens set only `duration` and rely on framer-motion's default
// tween easing (easeInOut), identical for enter and exit. scaleUp/scaleDown
// give the scale a spring (`type: "spring", damping: 15, stiffness: 300`);
// WAAPI has no spring, so approximate its slight overshoot with a back-out
// cubic-bezier on those two presets' enter tween (exit stays a plain tween,
// matching upstream's spring-free exit variant).
const DEFAULT_EASING = "ease-in-out";
const SPRING_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const PRESET_KEYFRAMES: Record<
  TextAnimatePreset,
  {
    hidden: Record<string, string | number>;
    visible: Record<string, string | number>;
    exit?: Record<string, string | number>;
  }
> = {
  fadeIn: {
    hidden: { opacity: 0, transform: "translateY(20px)" },
    visible: { opacity: 1, transform: "translateY(0)" },
  },
  blurIn: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0)" },
  },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", transform: "translateY(20px)" },
    visible: { opacity: 1, filter: "blur(0)", transform: "translateY(0)" },
  },
  blurInDown: {
    hidden: {
      opacity: 0,
      filter: "blur(10px)",
      transform: "translateY(-20px)",
    },
    visible: { opacity: 1, filter: "blur(0)", transform: "translateY(0)" },
  },
  slideUp: {
    hidden: { opacity: 0, transform: "translateY(20px)" },
    visible: { opacity: 1, transform: "translateY(0)" },
    exit: { opacity: 0, transform: "translateY(-20px)" },
  },
  slideDown: {
    hidden: { opacity: 0, transform: "translateY(-20px)" },
    visible: { opacity: 1, transform: "translateY(0)" },
    exit: { opacity: 0, transform: "translateY(20px)" },
  },
  slideLeft: {
    hidden: { opacity: 0, transform: "translateX(20px)" },
    visible: { opacity: 1, transform: "translateX(0)" },
    exit: { opacity: 0, transform: "translateX(-20px)" },
  },
  slideRight: {
    hidden: { opacity: 0, transform: "translateX(-20px)" },
    visible: { opacity: 1, transform: "translateX(0)" },
    exit: { opacity: 0, transform: "translateX(20px)" },
  },
  scaleUp: {
    hidden: { opacity: 0, transform: "scale(0.5)" },
    visible: { opacity: 1, transform: "scale(1)" },
  },
  scaleDown: {
    hidden: { opacity: 0, transform: "scale(1.5)" },
    visible: { opacity: 1, transform: "scale(1)" },
  },
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

function splitIntoSegments(text: string, by: TextAnimateBy): string[] {
  if (by === "text") return [text];
  if (by === "line") return text.split("\n");
  if (by === "character") return toGraphemes(text);
  // "word": upstream splits with `children.split(/(\s+)/)`, keeping each
  // whitespace run as its own segment so spacing survives AND the run counts
  // toward `segments.length` (and thus the stagger window).
  return text.split(/(\s+)/);
}

/**
 * Text that reveals itself segment by segment (character/word/line/whole)
 * with a small stagger delay between consecutive segments, animating from a
 * hidden keyframe (fade/blur/slide/scale) into its resting position. Waits
 * until scrolled into view by default (`startOnView`), replaying on every
 * re-entry unless `once` is set. Call with no arguments for a working demo.
 */
function textAnimate(props: TextAnimateProps = {}): DomphyElement {
  const textState = toState(
    props.text ?? "Domphy renders exactly what you write, nothing more.",
    "text-animate-text",
  );
  const by = props.by ?? "word";
  const animationPreset = props.animation ?? "fadeIn";
  // The `duration` prop sizes the stagger window (upstream `duration`), not the
  // per-segment tween — that is a fixed SEGMENT_TWEEN_MS, as upstream hard-codes.
  const staggerWindowMs = props.duration ?? 300;
  const startDelayMs = props.delay ?? 0;
  const startOnView = props.startOnView ?? true;
  const once = props.once ?? false;
  const wrapperTag = props.as ?? "p";
  const accessibility = props.accessibility ?? true;

  const preset = PRESET_KEYFRAMES[animationPreset] ?? PRESET_KEYFRAMES.fadeIn;
  const isSpringScale =
    animationPreset === "scaleUp" || animationPreset === "scaleDown";
  const enterEasing = isSpringScale ? SPRING_EASING : DEFAULT_EASING;
  const hiddenKeyframe = { ...preset.hidden, ...(props.initialStyle ?? {}) };
  const visibleKeyframe = { ...preset.visible, ...(props.animateStyle ?? {}) };
  const presetExitKeyframe = preset.exit ?? preset.hidden;
  const exitKeyframe = props.exitStyle
    ? { ...presetExitKeyframe, ...props.exitStyle }
    : presetExitKeyframe;

  // Shared, instance-scoped runtime state — persists across reactive
  // re-renders of the segment list (e.g. when `text` is a State and changes).
  const viewState = { hasEntered: !startOnView };
  const segmentPlayers: Array<() => void> = [];

  function buildSegmentElement(
    segment: string,
    index: number,
    currentText: string,
    count: number,
    staggerMs: number,
  ): DomphyElement<"span"> {
    const key = `${currentText}::${index}`;
    return {
      span: segment,
      _key: key,
      ...(accessibility ? { ariaHidden: "true" } : {}),
      style: {
        display: by === "line" ? "block" : "inline-block",
        // Upstream non-line segments carry `whitespace-pre`, so whitespace-run
        // segments keep their spaces instead of collapsing under inline-block.
        ...(by === "line" ? {} : { whiteSpace: "pre" }),
        willChange: "transform, opacity, filter",
        ...(props.segmentStyle ?? {}),
      } as StyleObject,
      _onMount: (node: ElementNode) => {
        if (typeof window === "undefined") return;
        const element = node.domElement as HTMLElement;
        const enterDelayMs = startDelayMs + index * staggerMs;
        const play = () => {
          if (typeof element.animate !== "function") return;
          element.animate(
            [hiddenKeyframe as Keyframe, visibleKeyframe as Keyframe],
            {
              duration: SEGMENT_TWEEN_MS,
              delay: enterDelayMs,
              easing: enterEasing,
              fill: "both",
            },
          );
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
        // Reversed order (upstream `staggerDirection: -1`, exit `delayChildren`
        // is 0): the last segment to enter is the first to leave.
        const exitDelayMs = (count - 1 - index) * staggerMs;
        const animation = element.animate(
          [visibleKeyframe as Keyframe, exitKeyframe as Keyframe],
          {
            duration: SEGMENT_TWEEN_MS,
            delay: exitDelayMs,
            easing: DEFAULT_EASING,
            fill: "both",
          },
        );
        animation.finished.then(
          () => done(),
          () => done(),
        );
      },
    };
  }

  function buildSegments(currentText: string): DomphyElement[] {
    const segments = splitIntoSegments(currentText, by);
    // Whole reveal spans `staggerWindowMs`, independent of segment count.
    const staggerMs =
      segments.length > 0 ? staggerWindowMs / segments.length : 0;
    return segments.map((segment, index) =>
      buildSegmentElement(
        segment,
        index,
        currentText,
        segments.length,
        staggerMs,
      ),
    );
  }

  const outer = {
    [wrapperTag]: (listener: Listener) => {
      const currentText = textState.get(listener);
      const segmentElements = buildSegments(currentText);
      if (!accessibility) return segmentElements;
      return [
        { span: currentText, _key: "sr-only-text", style: SR_ONLY_STYLE },
        ...segmentElements,
      ];
    },
    ...(accessibility
      ? { ariaLabel: (listener: Listener) => textState.get(listener) }
      : {}),
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
    // Upstream wrapper is a bare motion element with only `whitespace-pre-wrap`
    // (plus optional className) — no forced display, no typography.
    style: {
      whiteSpace: "pre-wrap",
      ...(props.style ?? {}),
    } as StyleObject,
  } as unknown as DomphyElement;

  return outer;
}

export { textAnimate };
