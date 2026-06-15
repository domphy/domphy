import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

/**
 * Styles a native progress bar: full-width, pill-shaped track with a themed fill,
 * including the WebKit progress-bar/value pseudo-elements and a width transition.
 *
 * @hostTag progress
 * @param props.color - Theme color tone for the track/background. Accepts a value or reactive
 *   state. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color tone for the filled value. Accepts a value or reactive
 *   state. Defaults to `"primary"`.
 * @example { progress: null, value: 40, max: 100, $: [progress()] }
 */
function progress(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "progress") {
        console.warn(`"progress" primitive patch must use progress tag`);
      }
    },
    style: {
      appearance: "none",
      width: "100%",
      height: themeSpacing(2),
      border: 0,
      borderRadius: themeSpacing(999),
      overflow: "hidden",
      backgroundColor: (listener) =>
        themeColor(listener, "shift-3", color.get(listener)),
      "&::-webkit-progress-bar": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-3", color.get(listener)),
        borderRadius: themeSpacing(999),
      },
      "&::-webkit-progress-value": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-9", accentColor.get(listener)),
        borderRadius: themeSpacing(999),
        transition: "width 220ms ease",
      },
    },
  };
}

export { progress };
