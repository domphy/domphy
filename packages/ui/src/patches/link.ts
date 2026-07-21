import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Themed hyperlink primitive: styles text color, hover underline, visited,
 * focus ring and a disabled state. Apply to an `<a>` element.
 *
 * @hostTag a
 * @param props - Optional configuration.
 * @param props.color - Base color tone for the link text. Defaults to `"primary"`.
 * @param props.accentColor - Accent color tone for visited/focus states. Defaults to `"secondary"`.
 * @example { a: "Home", href: "/", $: [link()] }
 */
function link(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "primary", "color");
  const accentColor = toState(props.accentColor ?? "secondary", "accentColor");
  return {
    _onInsert: (node) => {
      if (node.tagName !== "a") {
        console.warn(`"link" primitive patch must use a tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      textDecoration: "none",
      "&:visited": {
        color: (listener) =>
          themeColor(listener, "text", accentColor.get(listener)),
      },
      "&:hover:not([disabled])": {
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        textDecoration: "underline",
      },
      borderRadius: themeSpacing(1),
      // Kill the browser default outline so only the shared focusRing shows.
      outline: "none",
      transition: "color 140ms ease, box-shadow 140ms ease",
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
      },
    },
  };
}

export { link };
