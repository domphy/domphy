import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

/**
 * Renders superscript text (shrunk, baseline-raised) for the host `<sup>` element.
 *
 * @hostTag sup
 * @param props.color - Theme color for the text. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @example { sup: "2", $: [superscript()] }
 */
function superscript(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "sup") {
        console.warn(`"superscript" primitive patch must use sup tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      verticalAlign: "super",
      lineHeight: 0,
      color: (listener) => themeColor(listener, "text", color.get(listener)),
    },
  };
}

export { superscript };
