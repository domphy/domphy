import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a custom radio button with a themed circular box, checked dot, hover,
 * focus and disabled states. Apply to an `<input>` element of type `radio`
 * (the patch sets `type: "radio"`).
 *
 * @hostTag input
 * @param props.color - Optional theme color tone for the box/border (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @param props.accentColor - Optional theme color tone for the checked dot and focus ring (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "radio", $: [inputRadio()] }
 */
function inputRadio(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    type: "radio",
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(
          `"inputRadio" primitive patch must use input tag and radio type`,
        );
        return;
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      appearance: "none",
      display: "inline-flex",
      position: "relative",
      width: themeSpacing(6),
      height: themeSpacing(6),
      justifyContent: "center",
      alignItems: "center",
      transition: "background-color 300ms, outline-color 300ms",
      margin: 0,
      padding: 0,
      "&::before": {
        content: `""`,
        display: "block",
        borderRadius: "50%",
        lineHeight: 1,
        cursor: "pointer",
        border: "none",
        outlineOffset: "-1px",
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
        color: (listener) => themeColor(listener, "text", color.get(listener)),
        width: themeSpacing(4),
        height: themeSpacing(4),
      },
      "&:hover::before": {
        backgroundColor: (listener) =>
          themeColor(listener, "hover", color.get(listener)),
      },
      "&:checked::before": {
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
      },
      "&:checked::after": {
        content: `""`,
        position: "absolute",
        inset: "30%",
        borderRadius: "50%",
        backgroundColor: (listener) =>
          themeColor(listener, "shift-8", accentColor.get(listener)),
      },
      "&:checked:hover:not([disabled])::before": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-7", accentColor.get(listener)),
      },
      "&:focus-visible": {
        borderRadius: "50%",
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "&[disabled]": {
        cursor: "not-allowed",
        opacity: 0.7,
      },
      // Same fix as inputCheckbox: the old rule filled ::before with flat grey
      // and dropped its outline, so a disabled UNSELECTED radio rendered as a
      // solid dot-less disc that read as selected (observed in Chromium).
      "&[disabled]::before": {
        pointerEvents: "none",
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        backgroundColor: (listener) =>
          themeColor(listener, "inherit", "neutral"),
      },
      "&[disabled]:checked::after": {
        pointerEvents: "none",
        backgroundColor: (listener) =>
          themeColor(listener, "shift-8", "neutral"),
      },
    },
  };
}

export { inputRadio };
