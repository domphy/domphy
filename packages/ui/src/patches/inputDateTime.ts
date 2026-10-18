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
  // The edge is a box-shadow (`edge()`): an outline draws square corners before Chrome 94.
  // A later rule's box-shadow replaces an earlier one whole, so every edge rule
  // that can meet a focused field has a `:focus-visible` twin (one more class of
  // specificity, same relative order) carrying `focusRing, edge`.
  const baseEdge = (l: Listener) =>
    edge(themeColor(l, "border-strong", color.get(l)));
  const hoverEdge = (l: Listener) =>
    edge(themeColor(l, "shift-5", accentColor.get(l)));
  const errorEdge = (l: Listener) =>
    edge(themeColor(l, "shift-6", "error"), themeSpacing(0.5));
  const focused = (l: Listener, edgeValue: string) =>
    `${focusRing(l, accentColor.get(l))}, ${edgeValue}`;

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
      outline: "none",
      boxShadow: baseEdge,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      // Line box + paddingBlock, no height floor — the one shape every form
      // control in the row shares (inputText).
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      transition: "box-shadow 140ms ease",
      // Chrome's UA sheet pads the inner date editor by 1px top and bottom, so
      // the field stood 2px taller than every other control in a form row.
      "&::-webkit-datetime-edit": { paddingBlock: 0 },
      "&::-webkit-calendar-picker-indicator": {
        cursor: "pointer",
        opacity: 0.85,
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
      "&:invalid": {
        boxShadow: errorEdge,
      },
      "&:invalid:focus-visible": {
        boxShadow: (l) => focused(l, errorEdge(l)),
      },
    },
  };
}

export { inputDateTime };
