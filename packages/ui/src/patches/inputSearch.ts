import {
  type Listener,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { edge } from "../utils/edge.js";
import { fieldTextStyle } from "../utils/fieldText.js";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a search input with themed border, padding, placeholder color, native
 * search decorations, hover, focus and disabled states. Apply to an `<input>`
 * element of type `search` (the patch default is `type: "search"`; a native `type` wins).
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
  // The edge is a box-shadow (`edge()`): an outline draws square corners before Chrome 94.
  // A later rule's box-shadow replaces an earlier one whole, so every edge rule
  // that can meet a focused field has a `:focus-visible` twin (one more class of
  // specificity, same relative order) carrying `focusRing, edge`.
  const baseEdge = (l: Listener) =>
    edge(themeColor(l, "border-strong", color.get(l)));
  const hoverEdge = (l: Listener) =>
    edge(themeColor(l, "shift-5", accentColor.get(l)));
  const focused = (l: Listener, edgeValue: string) =>
    `${focusRing(l, accentColor.get(l))}, ${edgeValue}`;

  return {
    // Declared like any other attribute — the native element still wins over
    // this patch default if the host declares its own `type`.
    type: "search",
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"inputSearch" primitive patch must use input tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      ...fieldTextStyle(color),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      border: "none",
      outline: "none",
      boxShadow: baseEdge,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      minWidth: themeSpacing(32),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      transition: "box-shadow 140ms ease",
      "&::-webkit-search-decoration": {
        display: "none",
      },
      "&::-webkit-search-cancel-button": {
        cursor: "pointer",
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        boxShadow: hoverEdge,
      },
      "&:focus-visible": {
        boxShadow: (l) => focused(l, baseEdge(l)),
      },
      "&:hover:not([disabled]):not([aria-busy=true]):focus-visible": {
        boxShadow: (l) => focused(l, hoverEdge(l)),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        boxShadow: (listener) =>
          edge(themeColor(listener, "border-strong", "neutral")),
      },
    },
  };
}

export { inputSearch };
