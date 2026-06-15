import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

type InputDateTimeMode = "date" | "time" | "week" | "month" | "datetime-local";

/**
 * Styles a native date/time input with themed border, padding, hover, focus,
 * invalid and disabled states. The `mode` selects the input `type`. Apply to
 * an `<input>` element (the patch sets `type` to the chosen `mode`).
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
    type: mode,
    _onSchedule: (node, element) => {
      if (node.tagName !== "input") {
        console.warn(`"inputDateTime" primitive patch must use input tag`);
      }
      (element as any).type = mode;
    },
    style: {
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      "&::-webkit-calendar-picker-indicator": {
        cursor: "pointer",
        opacity: 0.85,
      },
      "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-8", "neutral"),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      },
      "&:invalid": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "error")}`,
      },
    },
  };
}

export { inputDateTime };
