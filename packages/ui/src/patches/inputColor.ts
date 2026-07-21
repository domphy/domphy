import type { PartialElement, ValueOrState } from "@domphy/core";
import { toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

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
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
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
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
      blockSize: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      inlineSize: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      backgroundColor: "transparent",
      transition: "box-shadow 140ms ease",
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, color.get(listener)),
      },
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
