import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

type InputDateTimeMode = "date" | "time" | "week" | "month" | "datetime-local";

/**
 * Styles a native date/time input with themed border, padding, hover, focus,
 * invalid and disabled states. The `mode` selects the input `type`. Apply to
 * an `<input>` element (the patch default `type` is the chosen `mode`; a native `type` wins).
 *
 * @hostTag input
 * @param props.mode - Input mode selecting the host `type`: `"date" | "time" | "week" | "month" | "datetime-local"`. Defaults to `"datetime-local"`.
 * @param props.color - Optional theme color tone for text/border (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @param props.accentColor - Optional theme color tone for the hover/focus ring (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "datetime-local", $: [inputDateTime()] }
 */
function inputDateTime(
  props: {
    mode?: InputDateTimeMode;
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const { mode = "datetime-local" } = props;
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    // Declared like any other attribute — the native element still wins over
    // this patch default if the host declares its own `type`.
    type: mode,
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"inputDateTime" primitive patch must use input tag`);
      }
    },
    style: {
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
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      // Line box + paddingBlock, no height floor — the one shape every form
      // control in the row shares (inputText).
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      // Chrome's UA sheet pads the inner date editor by 1px top and bottom, so
      // the field stood 2px taller than every other control in a form row.
      "&::-webkit-datetime-edit": { paddingBlock: 0 },
      "&::-webkit-calendar-picker-indicator": {
        cursor: "pointer",
        opacity: 0.85,
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
      "&:invalid": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "error")}`,
      },
    },
  };
}

export { inputDateTime };
