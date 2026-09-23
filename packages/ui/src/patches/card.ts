import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
  themeWeight,
} from "@domphy/theme";
import { elevation } from "../utils/elevation.js";

/**
 * A grid-based card surface that auto-places known child elements into named
 * regions: `<img>` (image), headings (title), `<p>` (description), `<aside>`
 * (aside), `<div>` (content), and `<footer>` (footer). Typically applied to a
 * `<div>` (any block container).
 *
 * @param props.color - Surface/border color tone. Optional `ValueOrState<ThemeColor>`, default "neutral".
 * @example { div: [{ h3: "Title", $: [heading()] }, { p: "Body", $: [paragraph()] }], $: [card({ color: "neutral" })] }
 */
function card(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  return {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gridTemplateAreas:
        '"image image" "title aside" "desc aside" "content content" "footer footer"',
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) =>
        themeColor(listener, "shift-10", color.get(listener)),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      outlineOffset: "-1px",
      // Soft lift so cards separate from the page without looking like dialogs.
      boxShadow: elevation("low"),
      overflow: "hidden",
      "& > img": {
        gridArea: "image",
        width: "100%",
        height: "auto",
        display: "block",
      },
      "& > :is(h1,h2,h3,h4,h5,h6)": {
        gridArea: "title",
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
        fontWeight: themeWeight("semibold"),
        color: (listener) =>
          themeColor(listener, "shift-11", color.get(listener)),
        margin: 0,
      },
      "& > p": {
        gridArea: "desc",
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
        paddingBottom: (listener) => themeSpacing(themeDensity(listener) * 2),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
        margin: 0,
      },
      "& > aside": {
        gridArea: "aside",
        alignSelf: "center",
        padding: (listener) => themeSpacing(themeDensity(listener) * 2),
        height: "auto",
      },
      // No `color` here: it repeated the exact same shift-10 the card's own
      // top-level `color` above already sets (and this content area inherits),
      // at (0,1,0)+combinator specificity that used to silently outrank a
      // composed child's own generated-class color — e.g. a `chart()`-mounted
      // div's own styling (packages/blocks' chart-bar/-line-interactive
      // recipes, doctor's descendant-color-override rule).
      "& > div": {
        gridArea: "content",
        padding: (listener) => themeSpacing(themeDensity(listener) * 4),
      },
      "& > footer": {
        gridArea: "footer",
        display: "flex",
        gap: themeSpacing(2),
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
        borderTop: (listener) =>
          `1px solid ${themeColor(listener, "border", color.get(listener))}`,
      },
    },
  };
}

export { card };
