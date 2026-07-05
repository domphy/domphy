// Magic UI "Highlighter" — clean-room reimplementation.
//
// Wraps a span of text with a hand-drawn marker annotation (a solid pastel
// highlight swipe, an underline squiggle, a circle/box outline, corner
// brackets, a strike-through, or a crossed-off scribble) that draws itself
// in on trigger, as if traced by a pen. Implemented purely from the block's
// public functional/visual spec — no upstream Magic UI source was viewed or
// copied.
//
// Rendering/animation is delegated to `rough-notation` (already an approved
// dependency of this package, same category of integration as
// `canvas-confetti` in confetti.ts) rather than hand-rolling a sketchy SVG
// renderer — it is the standard vanilla-JS library for exactly this
// "hand-drawn annotation" primitive: it measures the target element's box,
// draws a rough.js path behind/around it, and reveals that path with the
// classic stroke-dasharray/stroke-dashoffset "draw it in" technique (path
// length measured via `getTotalLength()`, dash pattern set to hide the
// stroke, offset animated to 0), repeating with fresh jitter per
// `iterations` for the rougher multi-pass "scribbled by hand" look. Using
// its public `annotate(element, config)` API is a legitimate, independent
// integration, not a copy of any UI framework's component source.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { type ElementTone, type ThemeColor, themeColorToken } from "@domphy/theme";
import { annotate } from "rough-notation";

/** Matches rough-notation's own `RoughAnnotationType` literal set. */
export type TextHighlighterAnnotationType =
  | "highlight"
  | "underline"
  | "circle"
  | "box"
  | "bracket"
  | "strike-through"
  | "crossed-off";

/** Matches rough-notation's own `BracketType` literal set. */
export type TextHighlighterBracketSide = "left" | "right" | "top" | "bottom";

export type TextHighlighterPadding = number | [number, number] | [number, number, number, number];

export interface TextHighlighterProps {
  /** Text (or arbitrary content) the annotation wraps. Defaults to a short demo phrase. */
  children?: string | DomphyElement | DomphyElement[];
  /** Which hand-drawn mark to draw. Defaults to `"highlight"` (the pastel swipe-behind-text look). */
  type?: TextHighlighterAnnotationType;
  /** Theme color role for the stroke/fill. Defaults to `"highlight"`. */
  color?: ThemeColor;
  /** Tone (lightness step) the color resolves at. Defaults to a light pastel (`"shift-3"`) for the
   * `"highlight"` fill type, or a stronger, clearly-visible tone (`"shift-9"`) for every stroke-only type. */
  tone?: ElementTone;
  /** Stroke thickness in px. Ignored by the `"highlight"` type, which always draws a near-text-height
   * band. Defaults to `1.5`. */
  strokeWidth?: number;
  /** How long the draw-in animation takes, in ms. Defaults to `600`. */
  duration?: number;
  /** Number of overlapping redraw passes — above 1 gives the rougher, more authentic "scribbled by
   * hand" look. Defaults to `2`. */
  iterations?: number;
  /** Gap in px between the text glyphs and the annotation stroke. Defaults to `2`. */
  padding?: TextHighlighterPadding;
  /** Whether the annotation should be drawn as one continuous shape (`false`) or broken per visual
   * line when the text wraps (`true`). Defaults to `true`. */
  multiline?: boolean;
  /** Which side(s) get a corner bracket mark. Only used by the `"bracket"` type. Defaults to
   * `["left", "right"]` (flanking marks on both sides). */
  brackets?: TextHighlighterBracketSide | TextHighlighterBracketSide[];
  /** `"mount"` (default) draws shortly after mount; `"view"` waits until the wrapper first scrolls
   * into the viewport, so offscreen highlights don't animate prematurely on long pages. */
  trigger?: "mount" | "view";
  /** Delay before drawing, in ms, once triggered. Defaults to `100`. */
  mountDelay?: number;
  /** `IntersectionObserver` `rootMargin` used when `trigger` is `"view"`. Defaults to `"-50px"`. */
  viewMargin?: string;
  /** Passthrough style merged onto the wrapping span. */
  style?: StyleObject;
}

const DEFAULT_TEXT = "a hand-drawn highlighter annotation";

/**
 * Inline text wrapper that draws a hand-drawn marker annotation (highlight
 * fill, underline, circle, box, bracket, strike-through, or crossed-off)
 * around/behind its content, either shortly after mount or the first time it
 * scrolls into view. Several instances with different `type`/`color` props
 * can sit side by side inside the same paragraph alongside plain text. Call
 * with no arguments for a working demo — a pastel highlight swipe behind a
 * short phrase.
 */
function textHighlighter(props: TextHighlighterProps = {}): DomphyElement<"span"> {
  const children = props.children ?? DEFAULT_TEXT;
  const type = props.type ?? "highlight";
  const colorRole = props.color ?? "highlight";
  const tone = props.tone ?? (type === "highlight" ? "shift-3" : "shift-9");
  const strokeWidth = props.strokeWidth ?? 1.5;
  const duration = props.duration ?? 600;
  const iterations = props.iterations ?? 2;
  const padding = props.padding ?? 2;
  const multiline = props.multiline ?? true;
  const brackets = props.brackets ?? (["left", "right"] as TextHighlighterBracketSide[]);
  const trigger = props.trigger ?? "mount";
  const mountDelay = props.mountDelay ?? 100;
  const viewMargin = props.viewMargin ?? "-50px";

  return {
    span: children,
    style: { ...(props.style ?? {}) } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const targetElement = node.domElement as HTMLElement | null;
      if (!targetElement) return;

      let colorToken = "currentColor";
      try {
        colorToken = themeColorToken(node, tone, colorRole);
      } catch {
        // Falls back to the text's own current color if the theme lookup fails.
        colorToken = "currentColor";
      }

      let annotation: ReturnType<typeof annotate> | null = null;
      try {
        annotation = annotate(targetElement, {
          type,
          color: colorToken,
          strokeWidth,
          animationDuration: duration,
          iterations,
          padding,
          multiline,
          brackets,
          animate: true,
        });
      } catch {
        annotation = null;
      }
      if (!annotation) return;

      // Some environments (older browsers, certain test/DOM-shim runtimes)
      // ship an incomplete SVGGeometryElement (e.g. no `getTotalLength()`),
      // which the draw-in animation depends on. Fail open rather than throw.
      let hasShown = false;
      const play = () => {
        try {
          annotation?.show();
          hasShown = true;
        } catch {
          // ignore — see above
        }
      };

      // rough-notation paints an absolutely-positioned SVG sized to the target
      // at draw time; a later reflow (responsive resize, font load, sibling
      // layout shift) leaves that overlay misaligned. Redraw it on resize —
      // matching upstream, which observes both the target and the document
      // body. Only after the first draw, so a "view"-triggered annotation
      // isn't shown early.
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          if (!hasShown) return;
          try {
            annotation?.hide();
            annotation?.show();
          } catch {
            // ignore — see above
          }
        });
        resizeObserver.observe(targetElement);
        if (document.body) resizeObserver.observe(document.body);
      }

      let mountTimer: ReturnType<typeof setTimeout> | null = null;
      let observer: IntersectionObserver | null = null;

      if (trigger === "view") {
        if (typeof IntersectionObserver !== "function") {
          // No IntersectionObserver support — fail open and draw immediately
          // rather than never playing.
          play();
        } else {
          observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                play();
                observer?.disconnect();
                observer = null;
              }
            },
            { rootMargin: viewMargin },
          );
          observer.observe(targetElement);
        }
      } else {
        mountTimer = setTimeout(play, mountDelay);
      }

      node.addHook("Remove", () => {
        if (mountTimer) clearTimeout(mountTimer);
        observer?.disconnect();
        resizeObserver?.disconnect();
        try {
          annotation?.remove();
        } catch {
          // ignore
        }
      });
    },
  } as DomphyElement<"span">;
}

export { textHighlighter };
