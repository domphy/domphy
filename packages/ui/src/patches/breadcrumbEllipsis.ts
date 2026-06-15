import type { PartialElement } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * An ellipsis trigger button for collapsed breadcrumb items, with hover and
 * focus-visible states. Apply to a `<button>` element.
 *
 * @hostTag button
 * @param props.color - Color tone for the trigger. Optional `ValueOrState<ThemeColor>`, default "neutral".
 * @example { button: "…", $: [breadcrumbEllipsis({ color: "neutral" })] }
 */
function breadcrumbEllipsis(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn('"breadcrumbEllipsis" patch must use button tag');
      }
    },
    ariaLabel: "More breadcrumb items",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingInline: themeSpacing(1),
      border: "none",
      background: "none",
      cursor: "pointer",
      color: (listener) => themeColor(listener, "shift-8", color.get(listener)),
      borderRadius: themeSpacing(1),
      "&:hover": {
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", color.get(listener)),
      },
      "&:focus-visible": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", color.get(listener))}`,
        outlineOffset: themeSpacing(0.5),
      },
    },
  };
}

export { breadcrumbEllipsis };
