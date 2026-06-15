import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

/**
 * Styles strongly emphasized (bold) text: inherited font size, `font-weight: 700`, and a
 * themed foreground color.
 *
 * @hostTag strong
 * @param props.color - Theme color tone for the text. Accepts a value or reactive state.
 *   Defaults to `"neutral"`.
 * @example { strong: "important", $: [strong()] }
 */
function strong(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "strong") {
        console.warn(`"strong" primitive patch must use strong tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      fontWeight: 700,
      color: (listener) =>
        themeColor(listener, "shift-11", color.get(listener)),
      backgroundColor: (listener) => themeColor(listener),
    },
  };
}

export { strong };
