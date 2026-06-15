import type { PartialElement } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles an inline icon container: square box that centers its content and
 * applies the themed icon color. Apply to a `<span>` element.
 *
 * @hostTag span
 * @param props.color - Optional theme color tone for the icon (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @example { span: null, $: [icon()] }
 */
function icon(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  return {
    _onInsert: (node) => {
      if (node.tagName !== "span") {
        console.warn(`"icon" primitive patch should use span tag`);
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      justifySelf: "center",
      verticalAlign: "middle",
      width: themeSpacing(4),
      height: themeSpacing(4),
      flexShrink: "0",
      fontSize: (listener) => themeSize(listener),
      backgroundColor: "transparent",
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
    },
  };
}

export { icon };
