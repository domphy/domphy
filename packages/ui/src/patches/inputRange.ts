import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a range slider with a themed track and thumb, hover, focus and
 * disabled states. Apply to an `<input>` element of type `range` (the patch
 * sets `type: "range"`).
 *
 * @hostTag input
 * @param props.color - Optional theme color tone for the slider track (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @param props.accentColor - Optional theme color tone for the thumb and focus ring (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "range", $: [inputRange()] }
 */
function inputRange(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    type: "range",
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"inputRange" primitive patch must use input tag`);
      }
    },
    style: {
      appearance: "none",
      width: "100%",
      margin: 0,
      padding: 0,
      height: themeSpacing(4),
      background: "transparent",
      cursor: "pointer",
      "&::-webkit-slider-runnable-track": {
        height: themeSpacing(1.5),
        borderRadius: themeSpacing(999),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-3", color.get(listener)),
      },
      "&::-webkit-slider-thumb": {
        appearance: "none",
        width: themeSpacing(4),
        height: themeSpacing(4),
        borderRadius: themeSpacing(999),
        border: "none",
        marginTop: `calc((${themeSpacing(1.5)} - ${themeSpacing(4)}) / 2)`,
        backgroundColor: (listener) =>
          themeColor(listener, "shift-9", accentColor.get(listener)),
      },
      "&:hover:not([disabled])::-webkit-slider-thumb": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-10", accentColor.get(listener)),
      },
      borderRadius: themeSpacing(2),
      transition: "box-shadow 140ms ease",
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
      },
    },
  };
}

export { inputRange };
