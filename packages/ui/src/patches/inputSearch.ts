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
 * Styles a search input with themed border, padding, placeholder color, native
 * search decorations, hover, focus and disabled states. Apply to an `<input>`
 * element of type `search` (the patch sets `type: "search"`).
 *
 * @hostTag input
 * @param props.color - Optional theme color tone for text/border/placeholder (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @param props.accentColor - Optional theme color tone for the hover/focus ring (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "search", $: [inputSearch()] }
 */
function inputSearch(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    type: "search",
    _onSchedule: (node, element) => {
      if (node.tagName !== "input") {
        console.warn(`"inputSearch" primitive patch must use input tag`);
      }
      (element as any).type = "search";
    },
    style: {
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      minWidth: themeSpacing(32),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      "&::placeholder": {
        color: (listener) =>
          themeColor(listener, "shift-7", color.get(listener)),
      },
      "&::-webkit-search-decoration": {
        display: "none",
      },
      "&::-webkit-search-cancel-button": {
        cursor: "pointer",
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-5", accentColor.get(listener))}`,
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
      },
    },
  };
}

export { inputSearch };
