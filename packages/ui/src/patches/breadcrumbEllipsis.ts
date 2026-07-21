import type { PartialElement } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

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
      color: (listener) => themeColor(listener, "muted", color.get(listener)),
      borderRadius: themeSpacing(1),
      transition:
        "color 140ms ease, background-color 140ms ease, box-shadow 140ms ease",
      "&:hover": {
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "hover", color.get(listener)),
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, color.get(listener)),
      },
    },
  };
}

export { breadcrumbEllipsis };
