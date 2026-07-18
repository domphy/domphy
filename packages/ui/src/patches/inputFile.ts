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
 * Styles a native file input with a themed upload button, border, hover, focus
 * and disabled states. Apply to an `<input>` element of type `file` (the patch
 * sets `type: "file"`).
 *
 * @hostTag input
 * @param props.color - Optional theme color tone for text/border and the upload button (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @param props.accentColor - Optional theme color tone for the hover/focus ring (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "file", $: [inputFile()] }
 */
function inputFile(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    type: "file",
    _onSchedule: (node, element) => {
      if (node.tagName !== "input") {
        console.warn(`"inputFile" primitive patch must use input tag`);
      }
      (element as any).type = "file";
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
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
      height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      "&::-webkit-file-upload-button": {
        marginTop: (listener) => themeSpacing(themeDensity(listener)),
        fontFamily: "inherit",
        fontSize: "inherit",
        border: "none",
        borderRadius: themeSpacing(1),
        height: themeSpacing(6),
        paddingInline: themeSpacing(2),
        cursor: "pointer",
        color: (listener) =>
          themeColor(listener, "shift-11", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "surface", color.get(listener)),
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-5", accentColor.get(listener))}`,
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "&[disabled]": {
        opacity: 0.8,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        backgroundColor: (listener) =>
          themeColor(listener, "surface", "neutral"),
      },
      "&[disabled]::-webkit-file-upload-button": {
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-3", "neutral"),
      },
    },
  };
}

export { inputFile };
