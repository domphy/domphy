// magicui "Text Reveal" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A tall
// scroll-through section pins a large paragraph in the vertical center of
// the viewport (`position: sticky`) while the oversized outer wrapper
// scrolls past underneath it. A full, low-opacity muted copy of the text
// sits behind a per-word copy whose opacity is driven directly by how far
// the pinned section has scrolled, so the paragraph reads as being "painted
// in" from washed-out gray to full color as the user scrolls down — and
// un-paints just as smoothly on scroll-up.
//
// The reveal is scroll-scrubbed (bidirectional, tied to live scroll offset),
// not a triggered one-time animation — driven by a rAF-debounced
// scroll/resize listener reading `getBoundingClientRect()` against
// `window.innerHeight`, with each word's opacity computed from an even
// 1/wordCount slice of the resulting 0-to-1 scroll-progress range. No CSS
// keyframes or IntersectionObserver are involved; `position: sticky` on the
// inner container plus the outer wrapper's oversized `min-height` is what
// creates the "pinned while scrolling past" room for a progressive reveal.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeFluidSpacing, themeSpacing } from "@domphy/theme";

export interface TextRevealProps {
  /** Text content to reveal, split into words on whitespace. Defaults to a short demo paragraph. */
  children?: string;
  /** Theme color for the always-visible faint background copy. Defaults to `"neutral"`. */
  mutedColor?: ThemeColor;
  /** Theme color each word resolves to once fully revealed. Defaults to `"neutral"`. */
  activeColor?: ThemeColor;
  /** How tall the scroll wrapper is, in viewport-height units — more height means more scroll
   * distance (and a slower-feeling reveal) for the same word count. Defaults to `200` (2x viewport),
   * clamped to a minimum of `120`. */
  wrapperHeightVh?: number;
  /** Passthrough style merged onto the sticky, centered inner container. */
  style?: StyleObject;
}

const DEFAULT_TEXT =
  "Domphy renders every element through a single reactive theme system, so as you scroll through this section each word brightens from a washed out gray into full readable color.";

// Constant opacity of the always-visible muted full-text layer behind the
// words — never fully invisible, so the unrevealed tail of the paragraph
// still reads as a shape while scrolling.
const RESTING_LAYER_OPACITY = 0.18;

/**
 * Maps overall scroll progress (0-1) to one word's own opacity via an even
 * slice of the range — 0 before its slice starts (fully transparent, so only
 * the muted background layer shows through) up to 1 once its slice ends.
 */
function wordOpacityForProgress(progress: number, wordIndex: number, wordCount: number): number {
  if (wordCount <= 0) return 1;
  const sliceStart = wordIndex / wordCount;
  const sliceEnd = (wordIndex + 1) / wordCount;
  const sliceProgress = wordCount === 1 ? progress : (progress - sliceStart) / (sliceEnd - sliceStart);
  return Math.min(1, Math.max(0, sliceProgress));
}

/**
 * A tall, scroll-through section that reveals a paragraph word-by-word,
 * scrubbed directly by scroll position rather than a timed or triggered
 * animation — scroll down to paint the words in, scroll back up to
 * un-paint them. Call with no arguments for a working demo paragraph.
 */
function textReveal(props: TextRevealProps = {}): DomphyElement<"div"> {
  const text = props.children ?? DEFAULT_TEXT;
  const mutedColor = props.mutedColor ?? "neutral";
  const activeColor = props.activeColor ?? "neutral";
  const wrapperHeightVh = Math.max(120, Math.round(props.wrapperHeightVh ?? 200));

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;
  const progress = toState(0);

  const paragraphTypography: StyleObject = {
    margin: 0,
    fontSize: () => themeFluidSpacing(6, 12),
    fontWeight: () => "700",
    // Fallback resting color for the paragraph itself — the background
    // layer overrides this with its own muted tone below, and the
    // foreground layer's per-word spans override it with their own
    // scroll-driven opacity, but the paragraph should still resolve a
    // themed color on its own rather than relying on CSS inheritance.
    color: (listener: Listener) => themeColor(listener, "shift-11", activeColor),
  };

  const foregroundWords: DomphyElement<"span">[] = words.map((word, index) => ({
    span: index < wordCount - 1 ? `${word} ` : word,
    _key: `word-${index}`,
    style: {
      opacity: (listener: Listener) => wordOpacityForProgress(progress.get(listener), index, wordCount),
      color: (listener: Listener) => themeColor(listener, "shift-11", activeColor),
    },
  }));

  return {
    div: [
      {
        div: [
          {
            div: [
              {
                p: text,
                ariaHidden: "true",
                style: {
                  ...paragraphTypography,
                  position: "absolute",
                  inset: 0,
                  opacity: RESTING_LAYER_OPACITY,
                  color: (listener: Listener) => themeColor(listener, "shift-6", mutedColor),
                },
              },
              {
                p: foregroundWords,
                style: { ...paragraphTypography, position: "relative" },
              },
            ],
            style: {
              position: "relative",
              maxWidth: themeSpacing(200),
              marginInline: "auto",
              paddingInline: themeSpacing(6),
            },
          },
        ],
        style: {
          position: "sticky",
          insetBlockStart: 0,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...(props.style ?? {}),
        },
      },
    ],
    style: { position: "relative", minHeight: `${wrapperHeightVh}vh` },
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;
      const element = node.domElement as HTMLElement;
      let frameHandle: number | null = null;

      const computeProgress = () => {
        frameHandle = null;
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const scrollableDistance = rect.height - viewportHeight;
        // 0 = the wrapper's top has just reached the viewport top (sticky pin
        // begins); 1 = the wrapper's bottom has reached the viewport bottom
        // (sticky pin is about to release). Falls back to the nearer clamp
        // bound when the wrapper is shorter than the viewport.
        const raw = scrollableDistance > 0 ? -rect.top / scrollableDistance : rect.top <= 0 ? 1 : 0;
        const clamped = Math.min(1, Math.max(0, raw));
        if (clamped !== progress.get()) progress.set(clamped);
      };

      // rAF-debounced: scroll/resize can fire many times per frame, but only
      // one recomputation is ever pending at a time.
      const scheduleUpdate = () => {
        if (frameHandle !== null) return;
        frameHandle = window.requestAnimationFrame(computeProgress);
      };

      scheduleUpdate();
      window.addEventListener("scroll", scheduleUpdate, { passive: true });
      window.addEventListener("resize", scheduleUpdate);

      node.addHook("Remove", () => {
        window.removeEventListener("scroll", scheduleUpdate);
        window.removeEventListener("resize", scheduleUpdate);
        if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
      });
    },
  } as DomphyElement<"div">;
}

export { textReveal };
