import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Themed form-label primitive: inline-flex layout with gap, themed text color,
 * focus-within highlighting and a disabled (`aria-disabled`) state. Apply to a
 * `<label>` element.
 *
 * @hostTag label
 * @param props - Optional configuration.
 * @param props.color - Base color tone for the label text. Defaults to `"neutral"`.
 * @param props.accentColor - Accent color tone applied on focus-within. Defaults to `"primary"`.
 * @example { label: "Email", htmlFor: "email", $: [label()] }
 */
function label(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "label") {
        console.warn(`"label" primitive patch must use label tag`);
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      cursor: "pointer",
      "&:focus-within": {
        color: (listener) =>
          themeColor(listener, "shift-10", accentColor.get(listener)),
      },
      "&[aria-disabled=true]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-8", "neutral"),
      },
    },
  };
}

export { label };
