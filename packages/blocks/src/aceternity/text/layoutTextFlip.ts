// Aceternity UI "Layout Text Flip" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// heading line pairing a fixed static lead-in phrase with a rotating word
// shown inside its own elevated, rounded badge — the badge crossfades the
// outgoing/incoming word (small vertical slide) AND smoothly tweens its own
// width to fit each new word, so the whole line visibly reflows around it
// instead of snapping.
//
// FIDELITY NOTE (per the task's own researchNote): the upstream docs page
// exposed only the props table (text/words/duration), not the rendered
// demo's computed badge styling — the badge's border/shadow/color below are
// this implementation's own reasonable design choice (an edge-anchored
// `dataTone` chip surface, this package's standard convention for a small
// elevated pill — see `iconBadge()` in `shadcn/sidebar/sidebar05-08-shared.ts`),
// not a confirmed 1:1 visual match.
//
// The word crossfade reuses this package's own `wordRotate.ts` idiom: a
// single-item reactive keyed list, replaced wholesale on each tick so the
// reconciler runs the outgoing key's `motion()` exit and the incoming key's
// enter at once. The badge's own width tween is a SEPARATE `motion()`
// instance applied to the badge itself, driven by a reactive `animate`
// `State<MotionKeyframe>` (`{ width: "…px" }`) — `motion()` replays a WAAPI
// animation whenever that state changes, and because only ONE keyframe is
// given, the Web Animations API implicitly starts from the badge's current
// (already-rendered) width — exactly the "eased tween from the old word's
// width to the new word's" the spec calls for. The target width itself is
// measured with an offscreen `canvas.measureText()` call (using the badge's
// own resolved font, read once via `getComputedStyle`) rather than waiting
// on a DOM mount/measure round-trip, so there is no mount-order dependency
// between the badge's own setup and the word layers swapping inside it. The
// very first word's width is written directly (no animation) so there is no
// layout jump before the first swap.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, motion } from "@domphy/ui";
import type { MotionKeyframe } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export interface LayoutTextFlipProps {
  /** Static lead-in phrase shown before the rotating word. Defaults to `"Build with"`. */
  text?: string;
  /** Words cycled through inside the badge, looping back to the first. Defaults to a short demo list. */
  words?: string[];
  /** Milliseconds each word stays visible before switching to the next. Defaults to `2500`. */
  duration?: number;
  /** Theme color family for the badge's own elevated surface. Defaults to `"primary"`. */
  badgeColor?: ThemeColor;
  /** Passthrough style merged onto the outer heading line. */
  style?: StyleObject;
  /** Passthrough style merged onto the badge wrapper. */
  badgeStyle?: StyleObject;
  /** Extra class name merged onto the outer heading container. */
  className?: string;
}

interface WordEntry {
  key: string;
  text: string;
}

const HORIZONTAL_PADDING_UNITS = 3;
const SLIDE_DISTANCE_EM = 0.4;
const CROSSFADE_DURATION_MS = 320;
const WIDTH_TWEEN_DURATION_MS = 380;
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

const DEFAULT_WORDS = ["curious", "creative", "capable", "reliable"];

function wordLayer(entry: WordEntry): DomphyElement<"span"> {
  return {
    span: entry.text,
    _key: entry.key,
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
    } as StyleObject,
    $: [
      motion({
        initial: { opacity: 0, y: `${SLIDE_DISTANCE_EM}em` },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: `-${SLIDE_DISTANCE_EM}em` },
        transition: { duration: CROSSFADE_DURATION_MS, easing: EASE_OUT_EXPO },
      }),
    ],
  };
}

/**
 * A heading line pairing a static lead-in phrase with a rotating word shown
 * inside its own elevated, rounded badge — the badge crossfades between
 * words and smoothly tweens its own width to fit each one, so the line
 * visibly reflows instead of snapping. Call with no arguments for a working
 * demo.
 */
function layoutTextFlip(props: LayoutTextFlipProps = {}): DomphyElement<"h2"> {
  const leadText = props.text ?? "Build with";
  const words = props.words && props.words.length > 0 ? props.words : DEFAULT_WORDS;
  const holdDurationMs = props.duration ?? 2500;
  const badgeColor = props.badgeColor ?? "primary";

  const layers = toState<WordEntry[]>([{ key: "word-0", text: words[0] }]);
  const badgeWidth = toState<MotionKeyframe>({});
  let wordIndex = 0;
  let insertCount = 0;

  // Populated once the badge mounts and resolves its own font — used both
  // for the very first word's initial (unanimated) width and for every
  // subsequent swap's target width.
  let measureWordWidth: ((word: string) => number) | null = null;
  let horizontalPaddingPx = 0;

  function targetWidthPx(word: string): number {
    const measuredWidth = measureWordWidth ? measureWordWidth(word) : word.length * 10;
    return Math.ceil(measuredWidth + horizontalPaddingPx * 2);
  }

  const advance = () => {
    if (words.length <= 1) return;
    wordIndex = (wordIndex + 1) % words.length;
    insertCount += 1;
    const nextWord = words[wordIndex];
    layers.set([{ key: `word-${insertCount}`, text: nextWord }]);
    badgeWidth.set({ width: `${targetWidthPx(nextWord)}px` });
  };

  const badgeElement: DomphyElement<"span"> = {
    span: [
      {
        span: (listener: Listener) => layers.get(listener).map(wordLayer),
        style: {
          position: "relative",
          display: "inline-block",
          minHeight: "1.15em",
          minWidth: "1ch",
        } as StyleObject,
      },
    ],
    // Edge-anchored dataTone chip surface — this package's standard
    // convention for a small elevated pill (adapts light/dark automatically,
    // per the doctor's dataTone-surface-contract idiom).
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
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", badgeColor),
      color: (listener: Listener) => themeColor(listener, "shift-11", badgeColor),
      ...(props.badgeStyle ?? {}),
    } as StyleObject,
    $: [motion({ animate: badgeWidth, transition: { duration: WIDTH_TWEEN_DURATION_MS, easing: EASE_OUT_EXPO } })],
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

      // Size the first word directly (no animation) so there is no jump
      // before the first scheduled swap.
      badgeDomElement.style.width = `${targetWidthPx(words[wordIndex])}px`;
    },
    _onRemove: () => {
      measureWordWidth = null;
    },
  };

  return {
    h2: [`${leadText} `, badgeElement],
    class: props.className,
    $: [heading()],
    style: {
      display: "inline-flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || words.length <= 1) return;
      const timer = window.setInterval(advance, holdDurationMs);
      node.addHook("Remove", () => window.clearInterval(timer));
    },
  } as DomphyElement<"h2">;
}

export { layoutTextFlip };
