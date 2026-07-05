// magicui "Line Shadow Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Large
// display text with a second, decorative copy of the same string sitting
// behind and offset from it (~0.04em down and to the right), that duplicate
// filled not with a flat shadow color but with a tight repeating diagonal
// stripe pattern — a comic-book "extruded" drop shadow made of fine lines
// instead of a blur.
//
// DOM technique: the duplicate string is generated via a CSS pseudo-element
// (`::after`) whose `content` reads `attr(data-shadow-text)` off the host
// element, rather than duplicating the string a second time as literal
// element content — the classic no-duplication "shadow text" trick, avoiding
// any risk of mismatched/stale copies and letting screen readers see the real
// text exactly once (the pseudo-element's generated content is not exposed to
// the accessibility tree in any current browser). The pseudo-element is
// positioned behind the real glyphs via `z-index: -1` on a `position:
// relative` host — negative-z-index descendants paint before a stacking
// context's own in-flow inline content, so it sits under the live text
// without needing any extra wrapper.
//
// The stripe fill itself is a small `repeating-linear-gradient` clipped to
// the pseudo-element's generated text (`background-clip: text` + transparent
// fill) — animating its `background-position` on a slow linear loop makes the
// stripe texture crawl diagonally, purely via CSS, no per-frame JS.
//
// The shadow color defaults to a theme-aware fixed-shift neutral tone
// (`themeColor(l, "shift-17", "neutral")`), which — because tone shifts are
// relative to the current theme surface, not an absolute lightness — already
// reads as near-black in a light theme and near-white in a dark theme with no
// separate dark-mode branch needed, matching the spec's "flips to white in
// dark mode" behavior.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

export type LineShadowTextTag = "span" | "div" | "p" | "article" | "section" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface LineShadowTextProps {
  /** Text content. Defaults to `"Line Shadow"`. */
  children?: string;
  /** Theme color family for the striped shadow layer. Defaults to `"neutral"`
   * at a fixed high-contrast shift, which flips light/dark automatically with the theme. */
  shadowColor?: ThemeColor;
  /** Wrapping element tag. Defaults to `"span"`. */
  as?: LineShadowTextTag;
  style?: StyleObject;
}

let lineShadowTextInstanceCounter = 0;

/**
 * Large display text with a diagonally-striped decorative shadow copy offset
 * behind it, its stripe texture continuously crawling on a slow endless loop.
 * Call with no arguments for a working demo.
 */
function lineShadowText(props: LineShadowTextProps = {}): DomphyElement {
  const text = props.children ?? "Line Shadow";
  const shadowColor = props.shadowColor ?? "neutral";
  const wrapperTag = props.as ?? "span";

  const instanceId = ++lineShadowTextInstanceCounter;
  const animationName = `line-shadow-text-crawl-${hashString(JSON.stringify({ instanceId, shadowColor }))}`;
  const keyframes = { from: { backgroundPosition: "0 0" }, to: { backgroundPosition: "0.12em 0.12em" } };

  const outer = {
    [wrapperTag]: text,
    dataShadowText: text,
    style: {
      position: "relative",
      display: "inline-block",
      // This is a large *display* text effect (the whole premise is a bold
      // heading with a decorative shadow copy) — without an explicit size
      // token it inherits whatever tiny ambient font-size the caller's
      // context happens to have, which reads as plain unstyled text.
      fontSize: (listener: Listener) => themeSize(listener, "increase-7"),
      fontWeight: () => "800",
      color: (listener: Listener) => themeColor(listener, "shift-9", shadowColor),
      "&::after": {
        content: "attr(data-shadow-text)",
        position: "absolute",
        inset: 0,
        zIndex: -1,
        transform: "translate(0.04em, 0.04em)",
        pointerEvents: "none",
        // Fine lines, not thick bars: upstream colors only the middle ~10% of
        // each 0.06em tile (its gradient runs `transparent 45%, color 45%,
        // color 55%, transparent`), so the colored band is 0.006em centered in
        // a 0.06em period. A 50% duty cycle reads as diagonal bars, not the
        // hair-thin "line shadow" the effect is named for.
        backgroundImage: (listener: Listener) =>
          `repeating-linear-gradient(45deg, transparent 0, transparent 0.027em, ${themeColor(listener, "shift-17", shadowColor)} 0.027em, ${themeColor(listener, "shift-17", shadowColor)} 0.033em, transparent 0.033em, transparent 0.06em)`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        animation: `${animationName} 15s linear infinite`,
        [`@keyframes ${animationName}`]: keyframes,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  } as unknown as DomphyElement;

  return outer;
}

export { lineShadowText };
