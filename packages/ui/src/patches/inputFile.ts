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

/**
 * Styles a native file input with a themed upload button, border, hover, focus
 * and disabled states. Apply to an `<input>` element of type `file` (the patch
 * default is `type: "file"`; a native `type` wins).
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
    type: "file",
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"inputFile" primitive patch must use input tag`);
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      border: "none",
      outline: "none",
      boxShadow: baseEdge,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      // Line box + paddingBlock, no height floor — the one shape every form
      // control in the row shares (inputText).
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
      transition: "box-shadow 140ms ease",
      "&::-webkit-file-upload-button": {
        marginTop: (listener) => themeSpacing(themeDensity(listener)),
        fontSize: "inherit",
        border: "none",
        borderRadius: themeSpacing(1),
        minHeight: themeSpacing(6),
        paddingInline: themeSpacing(2),
        cursor: "pointer",
        color: (listener) =>
          themeColor(listener, "shift-11", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "surface", color.get(listener)),
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
        opacity: 0.8,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
        boxShadow: (listener) =>
          edge(themeColor(listener, "border-strong", "neutral")),
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
