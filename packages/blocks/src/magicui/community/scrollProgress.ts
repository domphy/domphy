// Magic UI "Scroll Progress" — clean-room reimplementation.
//
// A thin bar fixed to the top of the viewport that fills left-to-right in
// proportion to how far the page has scrolled. Implemented purely from the
// block's public functional/visual spec — no upstream Magic UI source was
// viewed or copied.
//
// Scroll-linked continuous effects fall outside the declarative `motion()`
// patch (which drives one-shot enter/exit/re-animate transitions, not a
// per-frame value tied to an external event), so this follows the package's
// own guidance for such cases: a `scroll`/`resize` listener wired in
// `_onMount`, torn down in `_onRemove`, driving a `requestAnimationFrame`
// loop that lerps the visible fill toward the raw scroll fraction so it
// reads as fluid rather than jittery — the loop only runs while catching up
// (rAF-debounced), not continuously.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface ScrollProgressProps {
  /** Bar thickness, in `themeSpacing` units. Defaults to `1`. */
  thickness?: number;
  /** Theme color family for the fill gradient. Defaults to `"primary"`. */
  color?: ThemeColor;
  /** Lerp factor per animation frame (0–1); higher catches up faster. Defaults to `0.2`. */
  smoothing?: number;
  /** Stacking order. Defaults to `50`. */
  zIndex?: number;
  /**
   * Getter for a specific scrollable container to track instead of the
   * whole page/window. Called on mount and on every scroll/resize.
   */
  target?: () => Element | null;
  /** Passthrough style merged onto the bar. */
  style?: StyleObject;
}

/** Current scroll fraction (0–1) of `target`, or of the whole page when `target` is `window`. */
function readScrollFraction(target: Element | Window): number {
  if (target === window) {
    const doc = document.documentElement;
    const scrolled = window.scrollY ?? doc.scrollTop;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    return scrollable > 0 ? Math.min(1, Math.max(0, scrolled / scrollable)) : 0;
  }
  const element = target as HTMLElement;
  const scrollable = element.scrollHeight - element.clientHeight;
  return scrollable > 0 ? Math.min(1, Math.max(0, element.scrollTop / scrollable)) : 0;
}

/**
 * A slim, fixed-to-top bar whose fill tracks scroll position (0 at the top
 * of the page, full width at the bottom) — a passive, always-on reading
 * progress indicator. Call with no arguments to track the whole page.
 */
function scrollProgress(props: ScrollProgressProps = {}): DomphyElement<"div"> {
  const thickness = props.thickness ?? 1;
  const color = props.color ?? "primary";
  const smoothing = props.smoothing ?? 0.2;
  const zIndex = props.zIndex ?? 50;

  // Built through an untyped literal, then asserted, so `_doctorDisable` (a
  // doctor-only annotation not present in core's strict `PartialElement`
  // type) doesn't trip the excess-property check the function's declared
  // return type would otherwise apply to an inline return object.
  const barElement = {
    div: null,
    role: "progressbar",
    ariaHidden: "true",
    // A pure fill indicator with no text of its own — exempt from the
    // missing-color contract (same idiom as other decorative-only elements
    // in this package, e.g. marquee's fade overlay).
    _doctorDisable: "missing-color",
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement | null;
      if (!element) return;

      const getScrollTarget = (): Element | Window => props.target?.() ?? window;

      let currentFraction = readScrollFraction(getScrollTarget());
      let targetFraction = currentFraction;
      let animating = false;
      let rafHandle = 0;

      const paint = () => {
        element.style.transform = `scaleX(${currentFraction})`;
      };
      paint();

      const step = () => {
        currentFraction += (targetFraction - currentFraction) * smoothing;
        if (Math.abs(targetFraction - currentFraction) < 0.0008) {
          currentFraction = targetFraction;
          paint();
          animating = false;
          return;
        }
        paint();
        rafHandle = requestAnimationFrame(step);
      };

      const handleScroll = () => {
        targetFraction = readScrollFraction(getScrollTarget());
        if (!animating) {
          animating = true;
          rafHandle = requestAnimationFrame(step);
        }
      };

      let listenTarget: Element | Window = getScrollTarget();
      listenTarget.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll, { passive: true });

      node.addHook("Remove", () => {
        listenTarget.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (rafHandle) cancelAnimationFrame(rafHandle);
      });
    },
    style: {
      position: "fixed",
      insetInlineStart: 0,
      insetBlockStart: 0,
      width: "100%",
      height: themeSpacing(thickness),
      transformOrigin: "0% 50%",
      transform: "scaleX(0)",
      pointerEvents: "none",
      zIndex,
      backgroundImage: (listener: Listener) =>
        `linear-gradient(90deg, ${themeColor(listener, "shift-9", color)}, ${themeColor(listener, "shift-6", color)})`,
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;

  return barElement;
}

export { scrollProgress };
