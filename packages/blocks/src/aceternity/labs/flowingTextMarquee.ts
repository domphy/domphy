// Aceternity UI "Wispr Flow Text Animation" — clean-room reimplementation
// from the public one-line description ("Text marquee animation achieved
// with SVG and motion") and static preview image only; the interactive demo
// itself could not be loaded during research (see the spec's research note),
// so scroll speed and looping behavior are inferred, not confirmed.
//
// An ambient, auto-scrolling sentence that flows along a wavy/looping SVG
// path via `<textPath>`, rather than a straight marquee line. The scroll
// itself is driven by a native SMIL `<animate>` on `startOffset` — the same
// "declarative, no JS timers" technique shineBorder.ts uses for its rotating
// gradient — so it degrades to static (but still curved) text wherever SMIL
// is unavailable, and needs no per-frame JS at all for the common case.
//
// The sentence and its looping `<animate>` are both wrapped as their own
// keyed elements (`_key: "phrase-text"` / `"scroll-loop"`) inside the
// reactive `textPath` content array, so cycling between multiple phrases
// only replaces the text node's own content and never remounts (and
// restarts) the SMIL loop.
//
// `attributeName`/`repeatCount` are set imperatively in `_onMount` rather
// than as declarative props: Domphy's attribute renderer kebab-cases any
// attribute not on its `CamelAttributes` allowlist, and neither of these two
// SMIL attributes is on it (only `gradientTransform`/`gradientUnits`/etc are)
// — declaratively they'd render as `attribute-name="startOffset"` /
// `repeat-count="indefinite"`, which the SVG spec does not recognize, so the
// animation would silently do nothing in a real browser. `from`/`to`/`dur`
// are unaffected (already all-lowercase, so kebab-casing is a no-op).
//
// The curved `<svg>` copy is `aria-hidden` (a screen reader gets nothing
// useful from text bent along a path), paired with a visually-hidden plain-
// text duplicate of the current phrase — the same sr-only-text +
// aria-hidden-decoration split auroraText.ts uses for its own gradient-clip
// text.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

export interface FlowingTextMarqueeProps {
  /** Sentence(s) to flow along the curve. When more than one is given they cycle automatically. */
  phrases?: string[];
  /** How long each phrase is shown before cycling to the next, in ms. Only used when `phrases.length > 1`. Defaults to `7000`. */
  phraseDurationMs?: number;
  /** Raw SVG path data for the guide curve. Defaults to a wide, open wavy loop. */
  pathData?: string;
  /** Matches `pathData`'s coordinate space. Defaults to `"0 0 1200 480"`. */
  viewBox?: string;
  /** One full scroll loop, in seconds. Defaults to `26`. */
  scrollDurationSeconds?: number;
  /** Text color family. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Pauses the scroll while the pointer is over the section. Defaults to `false`. */
  pauseOnHover?: boolean;
  /** Strokes the guide curve itself instead of hiding it. Defaults to `false`. */
  showGuidePath?: boolean;
  style?: StyleObject;
}

const DEFAULT_PATH_DATA =
  "M 60 380 C 260 60, 620 60, 780 220 C 900 340, 1080 340, 1130 200 C 1170 90, 1080 20, 970 60 C 860 100, 840 220, 950 260";
const DEFAULT_VIEW_BOX = "0 0 1200 480";
const DEFAULT_PHRASE =
  "So basically what happened was we kept going back and forth about it for days until someone just decided to ship the thing and see what happens";

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

let flowingTextMarqueeInstanceCounter = 0;

/**
 * An ambient, auto-scrolling sentence that flows continuously along a
 * wavy/looping SVG path instead of a straight marquee line. Call with no
 * arguments for a working demo — a single generic dictation-style sentence
 * streaming through a wide open loop.
 */
function flowingTextMarquee(props: FlowingTextMarqueeProps = {}): DomphyElement<"div"> {
  const phrases = props.phrases && props.phrases.length > 0 ? props.phrases : [DEFAULT_PHRASE];
  const phraseDurationMs = props.phraseDurationMs ?? 7000;
  const pathData = props.pathData ?? DEFAULT_PATH_DATA;
  const viewBox = props.viewBox ?? DEFAULT_VIEW_BOX;
  const scrollDurationSeconds = props.scrollDurationSeconds ?? 26;
  const color = props.color ?? "neutral";
  const pauseOnHover = props.pauseOnHover ?? false;
  const showGuidePath = props.showGuidePath ?? false;

  const instanceId = ++flowingTextMarqueeInstanceCounter;
  const pathId = `domphy-flowing-text-marquee-path-${instanceId}`;

  const activePhraseIndex = toState(0);
  let cycleTimer: ReturnType<typeof setInterval> | null = null;
  let svgElement: SVGSVGElement | null = null;

  const currentPhraseText = (listener?: Listener) => {
    const phrase = phrases[activePhraseIndex.get(listener)];
    // Doubled with a spacer so the loop (start -> -100% offset) has no visible seam.
    return `${phrase}        ${phrase}`;
  };

  const guidePath: DomphyElement<"path"> = {
    path: null,
    id: pathId,
    d: pathData,
    fill: "none",
    stroke: showGuidePath ? (listener: Listener) => themeColor(listener, "shift-4", color) : "none",
    strokeWidth: "1.5",
  };

  const scrollLoop: DomphyElement<"animate"> = {
    animate: null,
    _key: "scroll-loop",
    from: "0%",
    to: "-50%",
    dur: `${scrollDurationSeconds}s`,
    _onMount: (node: ElementNode) => {
      const element = node.domElement as SVGAnimateElement | null;
      element?.setAttribute("attributeName", "startOffset");
      element?.setAttribute("repeatCount", "indefinite");
    },
  } as DomphyElement<"animate">;

  const phraseTextSpan: DomphyElement<"tspan"> = {
    tspan: phrases.length > 1 ? (listener: Listener) => currentPhraseText(listener) : currentPhraseText(),
    _key: "phrase-text",
  } as DomphyElement<"tspan">;

  return {
    div: [
      {
        span: phrases.length > 1 ? (listener: Listener) => phrases[activePhraseIndex.get(listener)] : phrases[0],
        _key: "sr-only-text",
        style: SR_ONLY_STYLE,
      } as DomphyElement<"span">,
      {
        svg: [
          { defs: [guidePath] } as DomphyElement,
          {
            text: [
              {
                textPath: [phraseTextSpan, scrollLoop],
                href: `#${pathId}`,
                // `startOffset` is case-sensitive SVG too and not on the allowlist — see the
                // file-header note on `scrollLoop` above.
                _onMount: (node: ElementNode) => (node.domElement as SVGTextPathElement | null)?.setAttribute("startOffset", "0%"),
              } as DomphyElement,
            ],
            // SVG `<text>` has no matching Domphy typography patch (heading()/paragraph()
            // assert their host is an h*/p tag) — theme-token *functions* below are the
            // doctor-compliant equivalent for SVG text; only literal values trip inline-typography.
            style: {
              fontSize: (listener: Listener) => themeSize(listener, "increase-2"),
              color: (listener: Listener) => themeColor(listener, "shift-7", color),
              fill: (listener: Listener) => themeColor(listener, "shift-7", color),
            } as StyleObject,
          } as DomphyElement<"text">,
        ],
        viewBox,
        xmlns: "http://www.w3.org/2000/svg",
        ariaHidden: "true",
        _onMount: (node: ElementNode) => {
          svgElement = node.domElement as SVGSVGElement | null;
        },
        _onRemove: () => {
          svgElement = null;
        },
        style: { display: "block", width: "100%", height: "auto" },
      } as DomphyElement<"svg">,
    ],
    onMouseEnter: () => {
      if (pauseOnHover) svgElement?.pauseAnimations?.();
    },
    onMouseLeave: () => {
      if (pauseOnHover) svgElement?.unpauseAnimations?.();
    },
    _onMount: () => {
      if (phrases.length <= 1) return;
      cycleTimer = setInterval(() => {
        activePhraseIndex.set((activePhraseIndex.get() + 1) % phrases.length);
      }, phraseDurationMs);
    },
    _onRemove: () => {
      if (cycleTimer) clearInterval(cycleTimer);
    },
    style: {
      position: "relative",
      width: "100%",
      overflow: "hidden",
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { flowingTextMarquee };
