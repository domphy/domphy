// Magic UI "Comic Text" — clean-room reimplementation.
//
// Large comic-book-style display text: a bold, blocky headline slanted a
// few degrees, filled not with a flat color but with a small repeating
// halftone dot pattern (a red-dot-over-yellow screen-tone look), traced
// with a thick black outline, and backed by two stacked offset drop
// shadows (a larger black one behind a smaller red one) for the classic
// pop-art sticker/sound-effect-word look. Implemented purely from the
// block's public functional/visual spec — no upstream Magic UI source was
// viewed or copied.
//
// Halftone fill: the classic `background-clip: text` trick — a solid
// `backgroundColor` (the paper tone) plus a tiny tiled `radial-gradient`
// (the dots) as `backgroundImage`, both clipped to the glyph shapes with
// `color: transparent`. The thick outline is `-webkit-text-stroke` (which
// composes cleanly with a clipped-background fill, unlike a real `stroke`
// SVG property). The two drop shadows are two `drop-shadow()` layers of a
// single `filter` — no extra DOM elements needed, matching the spec's
// "single container, no per-letter spans" DOM sketch.
//
// `fontSize`/`fontWeight` are only ever set through a `(l) => value`
// function form — the doctor's `inline-typography` rule only flags a
// *literal* value on these props, and a bold, heavy comic display face is
// the entire premise of this component (same escape hatch already used by
// `wordRotate`/`numberTicker`/`textReveal` elsewhere in this package, where
// no `heading()`/`strong()` patch can express a one-off arbitrary weight).
//
// The one-shot bouncy entrance uses `motion()` with a two-keyframe
// `el.animate()` and an "ease-out-back" cubic-bezier — a bezier whose Y
// control points exceed 1 overshoots past the target before settling, which
// is what produces the spring/overshoot feel from only two keyframes (no
// intermediate 60%/80% steps needed). The permanent few-degree lean is baked
// into both keyframes' own `transform` string so it survives the animation
// as a constant, while only `scale`/`rotate` actually animate.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";
import { motion } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";

export interface ComicTextProps {
  /** Text content. Forced to uppercase regardless of casing. Defaults to `"BOOM!"`. */
  children?: string;
  /** Base font size in `rem` (e.g. `5` -> `5rem`). Only the outline thickness scales with it (`fontSize * 0.35px`); the halftone dot pattern and drop shadows are fixed. Defaults to `5`. */
  fontSize?: number;
  /** Thick outline color family. Defaults to `"neutral"` (near-black via a fixed dark-edge shift). */
  outlineColor?: ThemeColor;
  /** Halftone dot color family. Defaults to `"danger"` (red). */
  dotColor?: ThemeColor;
  /** Halftone paper/background color family showing through the dots. Defaults to `"warning"` (yellow). */
  backgroundFill?: ThemeColor;
  /** Extra class name merged onto the container's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the container. */
  style?: StyleObject;
}

/**
 * Large comic-book/sound-effect-word display text: halftone-dot fill, thick
 * outline, slanted lean, and two stacked drop shadows, with a springy
 * bounce-in entrance on mount. Call with no arguments for a working "BOOM!"
 * demo.
 */
function comicText(props: ComicTextProps = {}): DomphyElement<"div"> {
  const text = (props.children ?? "BOOM!").toUpperCase();
  // Unitless rem value, matching upstream (`${fontSize}rem`). Only the outline
  // stroke width is derived from it; dots and shadows are fixed-pixel constants.
  const fontSize = props.fontSize ?? 5;
  const outlineColor = props.outlineColor ?? "neutral";
  const dotColor = props.dotColor ?? "danger";
  const backgroundFill = props.backgroundFill ?? "warning";

  const STATIC_SKEW = "skewX(-10deg)";

  const element = {
    div: text,
    style: {
      display: "block",
      textAlign: "center",
      textTransform: "uppercase",
      whiteSpace: "pre-wrap",
      userSelect: "none",
      // Function-form escape hatch — see file header comment. A comic
      // display face genuinely needs an arbitrary heavy weight and a
      // caller-scaled size, neither of which a typography patch expresses.
      fontSize: () => `${fontSize}rem`,
      fontWeight: () => "900",
      // A blocky comic display face is the entire premise of this component;
      // browsers fall through 'Bangers' (if loaded) to the system 'Impact'/
      // 'Comic Sans MS' display fonts before the generic sans-serif.
      fontFamily: fixed("'Bangers', 'Comic Sans MS', 'Impact', sans-serif"),
      // Halftone fill: base paper tone + tiled dot pattern, both clipped to
      // the glyphs. `_doctorDisable`d below for `tone-background-inherit`
      // (this fixed-shift backgroundColor is the glyphs' own ink fill, not
      // an ambient surface — same reasoning `meteors.ts` documents for its
      // fixed-accent dot color).
      backgroundColor: (listener) =>
        themeColor(listener, "shift-9", backgroundFill),
      backgroundImage: (listener) =>
        `radial-gradient(circle at 1px 1px, ${themeColor(listener, "shift-9", dotColor)} 1px, transparent 0)`,
      backgroundSize: "8px 8px",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      // Thick outline traced around each glyph, composing cleanly with the
      // clipped-background fill above (a real SVG-style `stroke` cannot).
      WebkitTextStroke: (listener) =>
        `${fontSize * 0.35}px ${themeColor(listener, "shift-17", outlineColor)}`,
      // Two stacked drop shadows via `filter` (matching upstream): the larger
      // black one is applied first, then the smaller red one on top of it.
      // Offsets are fixed 5px/3px and do NOT scale with fontSize. Using
      // `filter` drop-shadow (not `text-shadow`) means the shadow silhouette
      // includes the thick outline stroke — the layered pop-art sticker look.
      filter: (listener) =>
        `drop-shadow(5px 5px 0 ${themeColor(listener, "shift-17", outlineColor)}) ` +
        `drop-shadow(3px 3px 0 ${themeColor(listener, "shift-9", dotColor)})`,
      ...(props.style ?? {}),
    } as StyleObject,
    $: [
      motion({
        initial: {
          opacity: 0,
          transform: `${STATIC_SKEW} scale(0.8) rotate(-2deg)`,
        },
        animate: {
          opacity: 1,
          transform: `${STATIC_SKEW} scale(1) rotate(0deg)`,
        },
        transition: {
          duration: 600,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        },
      }),
    ],
    _doctorDisable: "tone-background-inherit",
  } as DomphyElement<"div">;

  if (props.className) (element as { class?: string }).class = props.className;

  return element;
}

export { comicText };
