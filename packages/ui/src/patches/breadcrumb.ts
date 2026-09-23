import type { PartialElement } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * A horizontal breadcrumb navigation that lays out its children with a
 * separator between items and marks the `[aria-current=page]` item
 * non-interactive. Apply to a `<nav>` element.
 *
 * Does not paint `color` on any crumb — each composed child (`link()` for
 * non-current items, `strong()` for the current one, or any other patch) owns
 * its own color; wrap the current crumb in `strong()` for the usual "reads
 * stronger" emphasis rather than relying on breadcrumb to repaint it.
 *
 * @hostTag nav
 * @param props.color - Color tone for the nav's own background/inherited text
 *   color and the separator glyphs. Optional `ValueOrState<ThemeColor>`, default "neutral".
 * @param props.separator - String inserted between items via `::after`. Optional `string`, default "/".
 * @example
 * { nav: [
 *   { a: "Home", href: "#", $: [link()] },
 *   { strong: "Settings", ariaCurrent: "page", $: [strong()] },
 * ], $: [breadcrumb({ separator: "›" })] }
 */
function breadcrumb(
  props: { color?: ValueOrState<ThemeColor>; separator?: string } = {},
): PartialElement {
  const { separator = "/" } = props;
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "nav")
        console.warn('"breadcrumb" patch must use nav tag');
    },
    // The `::after` separator glyph below sits at "muted" (shift-8, an 8-step
    // gap) — WCAG 1.4.3 exempts pure decoration, and the hierarchy it hints at
    // is already carried by the links themselves. Measured 4.06:1 light /
    // 4.24:1 dark. Declared here so the decision lives with the patch instead
    // of surfacing as an un-actionable info at all 26 breadcrumb call sites.
    _doctorDisable: "low-contrast",
    ariaLabel: "breadcrumb",
    style: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      fontSize: (listener) => themeSize(listener, "inherit"),
      gap: themeSpacing(1),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      // No `color` here: `color` inherits from the nav's own style above, so a
      // plain crumb (no patch of its own) already reads at "text" tone without
      // this rule repeating it — and repeating it at (0,1,0)+combinator
      // specificity used to tie (or beat, depending on injection order) a
      // composed crumb's own generated class, silently forcing link()'s
      // themed color or strong()'s emphasis color back to plain "text" (measured:
      // packages/blocks' shadcn sidebar breadcrumb, doctor's
      // descendant-color-override rule, 10 call sites).
      "& > *": {
        display: "inline-flex",
        alignItems: "center",
      },
      "& > *:not(:last-child)::after": {
        content: `"${separator}"`,
        // shift-4 measured 1.94:1 on the page surface (light) — the glyph was
        // all but invisible. "muted" is the de-emphasis tone shadcn's
        // breadcrumb separator uses (4.06:1 light / 4.24:1 dark).
        color: (listener) => themeColor(listener, "muted", color.get(listener)),
        paddingInlineStart: themeSpacing(1),
      },
      // No `color` here either, same reasoning as "& > *" above: the composed
      // crumb owns its own color (strong()'s shift-11, link()'s shift-13, or
      // nav's inherited "text" for a bare crumb) and breadcrumb does not
      // silently repaint it — measured via getComputedStyle in real Chromium
      // that a `color` here, even boosted to (0,3,0) specificity so it always
      // wins, forced strong()'s current-crumb text from its own shift-11 down
      // to breadcrumb's shift-10. A bare-text current crumb that wants visual
      // emphasis is the CALLER's recipe to add (wrap it in strong()), not
      // something breadcrumb prescribes for every consumer. `pointerEvents`
      // stays: the current item should not be clickable regardless of what
      // colors it.
      "& > [aria-current=page]": {
        pointerEvents: "none",
      },
    },
  };
}

export { breadcrumb };
