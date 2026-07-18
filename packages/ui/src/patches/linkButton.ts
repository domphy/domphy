import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * An `<a>` element styled to look like a button — same visual appearance as
 * `button()` but preserves link semantics (href, middle-click, right-click).
 * Apply to an `<a>` element.
 *
 * @hostTag a
 * @param props.color - Button color tone. Optional `ValueOrState<ThemeColor>`, default "primary".
 * @example { a: "Open app", href: "/app", $: [linkButton({ color: "primary" })] }
 */
function linkButton(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "primary", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "a") {
        console.warn(`"linkButton" primitive patch must use a tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      textDecoration: "none",
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      width: "fit-content",
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      gap: (listener) => themeSpacing(themeDensity(listener) * 1),
      userSelect: "none",
      cursor: "pointer",
      outlineOffset: "-1px",
      outlineWidth: "1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      transition:
        "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
      "&:hover": {
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "hover", color.get(listener)),
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, color.get(listener)),
      },
      "&[aria-disabled=true]": {
        opacity: 0.7,
        cursor: "not-allowed",
        pointerEvents: "none",
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        color: (listener) => themeColor(listener, "muted", "neutral"),
      },
    },
  };
}

export { linkButton };
