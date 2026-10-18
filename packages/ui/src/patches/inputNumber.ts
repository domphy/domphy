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
import { fieldTextStyle } from "../utils/fieldText.js";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a native number input with themed border, padding, visible spin
 * buttons, hover, focus and disabled states. Apply to an `<input>` element of
 * type `number` (the patch default is `type: "number"`; a native `type` wins).
 *
 * @hostTag input
 * @param props.color - Optional theme color tone for text/border (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @param props.accentColor - Optional theme color tone for the hover/focus ring (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "number", $: [inputNumber()] }
 */
function inputNumber(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
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
  const focused = (l: Listener, edgeValue: string) =>
    `${focusRing(l, accentColor.get(l))}, ${edgeValue}`;

  return {
    // Declared like any other attribute — the native element still wins over
    // this patch default if the host declares its own `type`.
    type: "number",
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"inputNumber" primitive patch must use input tag`);
      }
    },
    style: {
      lineHeight: "inherit",
      minWidth: themeSpacing(10),
      paddingInlineStart: (listener) =>
        themeSpacing(themeDensity(listener) * 3),
      paddingInlineEnd: (listener) =>
        themeSpacing(themeDensity(listener) * 1.5),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      fontSize: (listener) => themeSize(listener, "inherit"),
      border: "none",
      outline: "none",
      boxShadow: baseEdge,
      ...fieldTextStyle(color),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      transition: "box-shadow 140ms ease",
      "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
        opacity: 1,
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
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        boxShadow: (listener) =>
          edge(themeColor(listener, "border-strong", "neutral")),
        color: (listener) => themeColor(listener, "muted", "neutral"),
      },
    },
  };
}

export { inputNumber };
