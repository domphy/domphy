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
 * separator between items and highlights the `[aria-current=page]` item.
 * Apply to a `<nav>` element.
 *
 * @hostTag nav
 * @param props.color - Color tone for links/separators. Optional `ValueOrState<ThemeColor>`, default "neutral".
 * @param props.separator - String inserted between items via `::after`. Optional `string`, default "/".
 * @example { nav: null, $: [breadcrumb({ separator: "›" })] }
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
    ariaLabel: "breadcrumb",
    style: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      fontSize: (listener) => themeSize(listener, "inherit"),
      gap: themeSpacing(1),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      "& > *": {
        display: "inline-flex",
        alignItems: "center",
        color: (listener) =>
          themeColor(listener, "shift-8", color.get(listener)),
      },
      "& > *:not(:last-child)::after": {
        content: `"${separator}"`,
        color: (listener) =>
          themeColor(listener, "shift-4", color.get(listener)),
        paddingInlineStart: themeSpacing(1),
      },
      "& > [aria-current=page]": {
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        pointerEvents: "none",
      },
    },
  };
}

export { breadcrumb };
