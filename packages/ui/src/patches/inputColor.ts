import type { PartialElement, ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles a native color picker swatch with themed padding, rounded swatch and
 * disabled styling. Apply to an `<input>` element of type `color` (the patch
 * sets `type: "color"`).
 *
 * @hostTag input
 * @param props.color - Optional theme color tone used for the disabled state (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @param props.accentColor - Optional theme color tone (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "color", $: [inputColor()] }
 */
function inputColor(
  _props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  return {
    type: "color",
    _onSchedule: (node, element) => {
      if (node.tagName !== "input") {
        console.warn(`"inputColor" primitive patch must use input tag`);
      }
      (element as any).type = "color";
    },
    style: {
      appearance: "none",
      border: "none",
      cursor: "pointer",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
      blockSize: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      inlineSize: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      backgroundColor: "transparent",
      "&::-webkit-color-swatch-wrapper": {
        margin: 0,
        padding: 0,
      },
      "&::-webkit-color-swatch": {
        borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
      },
    },
  };
}

export { inputColor };
