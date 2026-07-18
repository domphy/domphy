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
 * Themed single-line text input primitive. Sets `type="text"` and styles the
 * field with themed border, focus ring, placeholder, disabled and validation
 * (`data-status`) states. Apply to an `<input>` element.
 *
 * @hostTag input
 * @param props - Optional configuration.
 * @param props.color - Base color tone for text/border/background. Defaults to `"neutral"`.
 * @param props.accentColor - Accent color tone for the hover/focus outline. Defaults to `"primary"`.
 * @example { input: "", type: "text", placeholder: "Name", $: [inputText()] }
 */
function inputText(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    type: "text",
    _onSchedule: (node, element) => {
      if (node.tagName !== "input") {
        console.warn(
          `"inputText" primitive patch must use input tag and text type`,
        );
      }
      (element as any).type = "text";
    },
    style: {
      fontFamily: "inherit",
      lineHeight: "inherit",
      minWidth: themeSpacing(10),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      fontSize: (listener) => themeSize(listener, "inherit"),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-7"),
      },
      "&:not(:placeholder-shown)": {
        color: (listener) => themeColor(listener, "shift-10"),
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
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        color: (listener) => themeColor(listener, "muted", "neutral"),
      },
      "&:invalid:not(:placeholder-shown)": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "error")}`,
      },
      "&[data-status=error]": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "error")}`,
      },
      "&[data-status=warning]": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "warning")}`,
      },
    },
  };
}

export { inputText };
