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
 * Themed single-line text input primitive. Sets `type` (default `"text"`) and
 * styles the field with themed border, focus ring, placeholder, disabled and
 * validation (`data-status`) states. Apply to an `<input>` element.
 *
 * @hostTag input
 * @param props - Optional configuration.
 * @param props.type - The input's `type` attribute (e.g. `"email"`, `"url"`, `"tel"`). Defaults to `"text"`.
 * @param props.color - Base color tone for text/border/background. Defaults to `"neutral"`.
 * @param props.accentColor - Accent color tone for the hover/focus outline. Defaults to `"primary"`.
 * @example { input: null, type: "text", placeholder: "Name", $: [inputText()] }
 */
function inputText(
  props: {
    type?: string;
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const { type = "text" } = props;
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
  const warningEdge = (l: Listener) =>
    edge(themeColor(l, "shift-6", "warning"), themeSpacing(0.5));
  const focused = (l: Listener, edgeValue: string) =>
    `${focusRing(l, accentColor.get(l))}, ${edgeValue}`;

  return {
    // Declared like any other attribute — the native element still wins over
    // this patch default if the host declares its own `type`.
    type,
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(
          `"inputText" primitive patch must use input tag and text type`,
        );
      }
    },
    style: {
      lineHeight: "inherit",
      minWidth: themeSpacing(10),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
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
      // `[placeholder]` is load-bearing: `:placeholder-shown` only matches an
      // input that HAS a placeholder, so on a field without one
      // `:not(:placeholder-shown)` is always true and a pristine untouched
      // `required` field painted itself red before the user typed a character.
      // Fields with no placeholder opt into the error look via `data-status`.
      "&[placeholder]:invalid:not(:placeholder-shown)": {
        boxShadow: errorEdge,
      },
      "&[placeholder]:invalid:not(:placeholder-shown):focus-visible": {
        boxShadow: (l) => focused(l, errorEdge(l)),
      },
      "&[data-status=error]": {
        boxShadow: errorEdge,
      },
      "&[data-status=error]:focus-visible": {
        boxShadow: (l) => focused(l, errorEdge(l)),
      },
      "&[data-status=warning]": {
        boxShadow: warningEdge,
      },
      "&[data-status=warning]:focus-visible": {
        boxShadow: (l) => focused(l, warningEdge(l)),
      },
    },
  };
}

export { inputText };
