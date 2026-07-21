// Magic UI "Scroll Progress" — verified directly against the real upstream
// source (registry/magicui/scroll-progress.tsx, MIT-licensed).
//
// Upstream is a single `motion.div` fixed to the top of the viewport whose
// `scaleX` is bound DIRECTLY to `useScroll().scrollYProgress` — an
// instantaneous 1:1 track of the scroll fraction, no spring/easing, no lag.
// It carries NO ARIA attributes.
//
// Two upstream details need translation into Domphy conventions:
//
//   1. The gradient. Upstream is a three-stop multi-hue sweep
//      `from-[#A97CF8] via-[#F38CB8] to-[#FDCC92]` (purple -> pink -> peach).
//      Domphy's doctor rules forbid raw hex literals on style props, so — as
//      `rainbowButton`/`neonGradientCard` already do for their multi-hue
//      gradients — each distinct upstream hue maps to the closest distinct
//      built-in `ThemeColor` family: purple -> "primary" (the theme has no
//      violet family; primary is the hue-closest cool family), pink ->
//      "secondary" (the theme's rose/pink family, a near-exact match), peach
//      -> "warning" (the theme's peach/orange family, a near-exact match).
//      This keeps the sweep theme-aware (it follows light/dark swaps) at the
//      cost of not accepting an arbitrary caller hex list.
//
//   2. Scroll binding. A scroll-linked value tied to an external event falls
//      outside the declarative `motion()` patch (one-shot enter/exit
//      transitions, not a per-frame value). So a `scroll`/`resize` listener is
//      wired in `_onMount`, torn down in `_onRemove`, and writes `scaleX`
//      straight from the current scroll fraction on each event — matching
//      upstream's instantaneous 1:1 track (no smoothing/lerp).

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface ScrollProgressProps {
  /** Bar thickness, in `themeSpacing` units. Defaults to `0.25` (~1px at the default root font size, matching the spec's `h-px`). */
  thickness?: number;
  /**
   * Gradient stops the fill blends through, left-to-right. Defaults to
   * `["primary", "secondary", "warning"]`, mapping upstream's three-hue
   * `#A97CF8`/`#F38CB8`/`#FDCC92` (purple/pink/peach) sweep to the closest
   * distinct theme families.
   */
  colors?: ThemeColor[];
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

const DEFAULT_COLORS: ThemeColor[] = ["primary", "secondary", "warning"];

/** Scroll metrics for a target: fraction is only meaningful when `hasOverflow`. */
function readScrollState(target: Element | Window): {
  fraction: number;
  hasOverflow: boolean;
} {
  if (target === window) {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    if (scrollable <= 0) return { fraction: 0, hasOverflow: false };
    const scrolled = window.scrollY ?? doc.scrollTop;
    return {
      fraction: Math.min(1, Math.max(0, scrolled / scrollable)),
      hasOverflow: true,
    };
  }
  const element = target as HTMLElement;
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) return { fraction: 0, hasOverflow: false };
  return {
    fraction: Math.min(1, Math.max(0, element.scrollTop / scrollable)),
    hasOverflow: true,
  };
}

/** Current scroll fraction (0–1). Returns 0 when the target has no overflow. */
function readScrollFraction(target: Element | Window): number {
  return readScrollState(target).fraction;
}

/**
 * A slim, fixed-to-top bar whose fill tracks scroll position 1:1 (0 at the top
 * of the page, full width at the bottom) — a passive, always-on reading
 * progress indicator. Call with no arguments to track the whole page.
 */
function scrollProgress(props: ScrollProgressProps = {}): DomphyElement<"div"> {
  const thickness = props.thickness ?? 0.25;
  const colors =
    props.colors && props.colors.length > 0 ? props.colors : DEFAULT_COLORS;
  const zIndex = props.zIndex ?? 50;

  // Built through an untyped literal, then asserted, so `_doctorDisable` (a
  // doctor-only annotation not present in core's strict `PartialElement`
  // type) doesn't trip the excess-property check the function's declared
  // return type would otherwise apply to an inline return object.
  const barElement = {
    div: null,
    // A pure fill indicator with no text of its own — exempt from the
    // missing-color contract (same idiom as other decorative-only elements
    // in this package, e.g. marquee's fade overlay). Upstream's `motion.div`
    // carries no ARIA, so none is added here either.
    _doctorDisable: "missing-color",
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement | null;
      if (!element) return;

      const getScrollTarget = (): Element | Window =>
        props.target?.() ?? window;

      // Instantaneous 1:1 track: write scaleX straight from the current scroll
      // fraction on every scroll/resize — no lerp/spring, matching upstream's
      // direct `scaleX = scrollYProgress` binding.
      const paint = () => {
        const { fraction, hasOverflow } = readScrollState(getScrollTarget());
        // Resting floor ONLY when there is nothing to scroll (catalog cells /
        // short pages). A real page at scrollTop=0 must show scaleX(0).
        const display = hasOverflow ? fraction : 0.42;
        element.style.transform = `scaleX(${display})`;
      };
      paint();

      const listenTarget: Element | Window = getScrollTarget();
      listenTarget.addEventListener("scroll", paint, { passive: true });
      window.addEventListener("resize", paint, { passive: true });

      node.addHook("Remove", () => {
        listenTarget.removeEventListener("scroll", paint);
        window.removeEventListener("resize", paint);
      });
    },
    style: {
      position: "fixed",
      insetInlineStart: 0,
      insetBlockStart: 0,
      width: "100%",
      height: themeSpacing(thickness),
      transformOrigin: "0% 50%",
      // Resting fill before mount/scroll (solo catalog pages often have no
      // overflow — scaleX(0) made the cell look empty).
      transform: "scaleX(0.42)",
      pointerEvents: "none",
      zIndex,
      backgroundImage: (listener: Listener) =>
        `linear-gradient(90deg, ${colors.map((color) => themeColor(listener, "shift-5", color)).join(", ")})`,
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;

  return barElement;
}

export { scrollProgress };
