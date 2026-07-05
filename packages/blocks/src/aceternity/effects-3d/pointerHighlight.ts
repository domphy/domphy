// Aceternity UI "Pointer Highlight" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// short inline phrase that, the first time it scrolls into the viewport, gets
// a hand-off animated rectangle outline drawn around it plus a small
// mouse-cursor glyph that pops in beside one corner — a scroll-triggered,
// one-shot "highlighter annotation", not a hover/cursor-tracking effect (per
// the task's own researchNote: an initial cursor-tracking read of the source
// was inaccurate — the real trigger is `useInView`, so this ports the
// documented in-view behavior, not pointer tracking).
//
// The rectangle "draws itself" via the classic SVG line-draw trick — a
// `pathLength="100"`-normalized `stroke-dasharray`/`stroke-dashoffset` pair
// animated from fully offset (100) to zero via `motion()` (Web Animations
// API) — rather than a plain opacity/scale fade, so it visually reads as an
// outline being traced, matching the spec's "animates in... so it looks like
// it is being outlined" wording. `pathLength="100"` (the same technique this
// package's own `borderBeam.ts`/`shineBorder.ts` use for their orbiting
// comets) normalizes the rect's length to exactly 100 units regardless of
// its actual rendered perimeter, so the dash values never need a
// `ResizeObserver`/layout measurement to look correct at any text size. The
// pointer glyph is a small hand-authored solid-fill SVG cursor arrow (not
// traced from any icon library), faded + slid in from a short offset,
// staggered slightly after the rectangle via a longer `transition.delay`.
//
// Both reveals are driven by a plain `State<MotionKeyframe>` written once
// inside an `IntersectionObserver` callback — the same "toState + motion(),
// flipped once by an observer" idiom this package's own `blurFade.ts` uses
// for its `trigger: "view"` mode.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { type MotionKeyframe, motion, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type PointerHighlightCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface PointerHighlightProps {
  /** The highlighted phrase itself. Defaults to a short demo phrase. */
  children?: DomphyElement | string;
  /** Plain text rendered before the highlighted phrase. Defaults to `"Scroll down to see "`. */
  leadingText?: string;
  /** Plain text rendered after the highlighted phrase. Defaults to `" get highlighted."`. */
  trailingText?: string;
  /** Theme color family for the rectangle stroke and pointer fill. Defaults to `"info"`. */
  color?: ThemeColor;
  /** Padding between the text and the rectangle outline, in `themeSpacing` units. Defaults to `1.5`. */
  padding?: number;
  /** Rectangle corner radius, in px (an SVG geometry attribute, not a CSS style value). Defaults to `8`. */
  cornerRadius?: number;
  /** Which corner of the rectangle the pointer glyph anchors near. Defaults to `"bottom-right"`. */
  pointerCorner?: PointerHighlightCorner;
  /** Plays once and never replays on later scroll-outs/scroll-ins when `true` (default). `false` re-plays (and reverses) every time visibility toggles. */
  once?: boolean;
  /** Milliseconds the rectangle's draw-in animation takes. Defaults to `600`. */
  duration?: number;
  /** Extra milliseconds the pointer glyph waits after the rectangle starts drawing. Defaults to `350`. */
  pointerStagger?: number;
  /** `IntersectionObserver` `rootMargin`. Defaults to `"-80px"` (fires slightly before fully visible). */
  viewMargin?: string;
  /** Extra class name merged onto the outer wrapper's native `class` attribute. */
  containerClassName?: string;
  /** Extra class name merged onto the rectangle overlay's native `class` attribute. */
  rectangleClassName?: string;
  /** Extra class name merged onto the pointer glyph's native `class` attribute. */
  pointerClassName?: string;
  /** Passthrough style merged onto the outer wrapper `<p>`. */
  style?: StyleObject;
}

// With `pathLength="100"` set on the rect, its length is normalized to
// exactly 100 units no matter how large the highlighted phrase renders —
// so the dash offset always animates over the same 0-100 range.
const RECT_PATH_LENGTH = 100;

const HIDDEN_RECT_FRAME: MotionKeyframe = { strokeDashoffset: RECT_PATH_LENGTH, opacity: 0 };
const VISIBLE_RECT_FRAME: MotionKeyframe = { strokeDashoffset: 0, opacity: 1 };

const POINTER_OFFSET_PX = 6;

function hiddenPointerFrame(corner: PointerHighlightCorner): MotionKeyframe {
  const fromLeft = corner === "top-left" || corner === "bottom-left";
  const fromTop = corner === "top-left" || corner === "top-right";
  return {
    opacity: 0,
    scale: 0.5,
    x: fromLeft ? -POINTER_OFFSET_PX : POINTER_OFFSET_PX,
    y: fromTop ? -POINTER_OFFSET_PX : POINTER_OFFSET_PX,
  };
}
const VISIBLE_POINTER_FRAME: MotionKeyframe = { opacity: 1, scale: 1, x: 0, y: 0 };

// Hand-authored solid-fill cursor/pointer-arrow glyph (24x24) — a simple
// geometric arrow silhouette, not traced from or sourced out of any icon
// library.
const POINTER_GLYPH_PATH = "M5 3 L5 19 L9.5 15 L12.5 21 L15.3 19.6 L12.3 13.6 L18 13.6 Z";

function cornerAnchorStyle(corner: PointerHighlightCorner): StyleObject {
  const style: StyleObject = { position: "absolute" };
  if (corner === "top-left" || corner === "bottom-left") style.insetInlineStart = themeSpacing(-3);
  else style.insetInlineEnd = themeSpacing(-3);
  if (corner === "top-left" || corner === "top-right") style.insetBlockStart = themeSpacing(-3);
  else style.insetBlockEnd = themeSpacing(-3);
  return style;
}

/**
 * Wraps an inline phrase so that, the first time it scrolls into view, an
 * animated rectangle outline draws itself around it and a small pointer
 * glyph pops in beside one corner — a one-shot "highlighter annotation"
 * triggered purely by scroll position, not by hover. Call with no arguments
 * for a working demo — a short sentence with a highlighted phrase.
 */
function pointerHighlight(props: PointerHighlightProps = {}): DomphyElement<"p"> {
  // Not "Try clicking on this button" — the effect triggers on scroll-into-
  // view (see the IntersectionObserver below), not on click, and `highlighted`
  // renders as a plain <span>, never an actual <button> — that copy read as a
  // real, unresponsive clickable button to anyone landing on the demo.
  const highlighted = props.children ?? "this phrase";
  const leadingText = props.leadingText ?? "Scroll down to see ";
  const trailingText = props.trailingText ?? " get highlighted.";
  const color = props.color ?? "info";
  const padding = props.padding ?? 1.5;
  const cornerRadius = props.cornerRadius ?? 8;
  const pointerCorner = props.pointerCorner ?? "bottom-right";
  const once = props.once ?? true;
  const duration = Math.max(120, props.duration ?? 600);
  const pointerStagger = Math.max(0, props.pointerStagger ?? 350);
  const viewMargin = props.viewMargin ?? "-80px";

  const rectangleFrame = toState<MotionKeyframe>(HIDDEN_RECT_FRAME);
  const pointerFrame = toState<MotionKeyframe>(hiddenPointerFrame(pointerCorner));

  const rectangleOverlay: DomphyElement<"svg"> = {
    svg: [
      {
        rect: null,
        x: "1",
        y: "1",
        width: "calc(100% - 2px)",
        height: "calc(100% - 2px)",
        rx: String(cornerRadius),
        fill: "none",
        pathLength: String(RECT_PATH_LENGTH),
        strokeDasharray: String(RECT_PATH_LENGTH),
        // Decorative outline path with no text of its own — exempt from the
        // missing-color contract, matching this package's other purely
        // decorative overlay elements (e.g. `heroHighlight.ts`'s marker bar).
        _doctorDisable: "missing-color",
        style: {
          stroke: (listener: Listener) => themeColor(listener, "shift-9", color),
        } as StyleObject,
        strokeWidth: "2",
        strokeLinecap: "round",
        $: [
          motion({
            initial: HIDDEN_RECT_FRAME,
            animate: rectangleFrame,
            transition: { duration, easing: "ease-out" },
          }),
        ],
      } as DomphyElement,
    ],
    ariaHidden: "true",
    class: props.rectangleClassName,
    style: {
      position: "absolute",
      inset: themeSpacing(-padding),
      // `<svg>` is a replaced element (like `<img>`) — `position: absolute` +
      // `inset` alone positions it but does NOT stretch it to fill the
      // resulting box; without an explicit width/height it falls back to the
      // browser's default intrinsic SVG size (300x150px), rendering as a
      // giant box instead of hugging the highlighted phrase.
      width: "100%",
      height: "100%",
      overflow: "visible",
      pointerEvents: "none",
    } as StyleObject,
  } as DomphyElement<"svg">;

  const pointerElement: DomphyElement<"svg"> = {
    svg: [{ path: null, d: POINTER_GLYPH_PATH } as DomphyElement],
    viewBox: "0 0 24 24",
    fill: "currentColor",
    ariaHidden: "true",
    class: props.pointerClassName,
    style: {
      ...cornerAnchorStyle(pointerCorner),
      width: themeSpacing(5),
      height: themeSpacing(5),
      color: (listener: Listener) => themeColor(listener, "shift-9", color),
      pointerEvents: "none",
    } as StyleObject,
    $: [
      motion({
        initial: hiddenPointerFrame(pointerCorner),
        animate: pointerFrame,
        transition: { duration: Math.max(120, duration * 0.6), delay: pointerStagger, easing: "ease-out" },
      }),
    ],
  } as DomphyElement<"svg">;

  const highlightWrapper: DomphyElement<"span"> = {
    span: [
      { span: highlighted, style: { position: "relative", zIndex: 1 } } as DomphyElement,
      rectangleOverlay,
      pointerElement,
    ],
    class: props.containerClassName,
    style: { position: "relative", display: "inline-block" } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof IntersectionObserver !== "function") {
        // No IntersectionObserver support (e.g. non-browser test runtime) —
        // fail open and reveal immediately rather than never playing.
        rectangleFrame.set(VISIBLE_RECT_FRAME);
        pointerFrame.set(VISIBLE_POINTER_FRAME);
        return;
      }
      const element = node.domElement as Element;
      let hasPlayedOnce = false;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (once && hasPlayedOnce) continue;
              hasPlayedOnce = true;
              rectangleFrame.set(VISIBLE_RECT_FRAME);
              pointerFrame.set(VISIBLE_POINTER_FRAME);
              if (once) {
                observer.disconnect();
              }
            } else if (!once) {
              rectangleFrame.set(HIDDEN_RECT_FRAME);
              pointerFrame.set(hiddenPointerFrame(pointerCorner));
            }
          }
        },
        { rootMargin: viewMargin },
      );
      observer.observe(element);
      node.addHook("Remove", () => observer.disconnect());
    },
  } as DomphyElement<"span">;

  return {
    p: [leadingText, highlightWrapper, trailingText],
    $: [paragraph()],
    style: props.style,
  } as DomphyElement<"p">;
}

export { pointerHighlight };
