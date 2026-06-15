import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

/**
 * Italic emphasized inline text. Apply to an `<em>` element.
 *
 * @hostTag em
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the text. Defaults to "neutral".
 * @example { em: "important", $: [emphasis()] }
 */
function emphasis(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "em") {
        console.warn(`"emphasis" primitive patch must use em tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      fontStyle: "italic",
      color: (listener) =>
        themeColor(listener, "shift-10", color.get(listener)),
    },
  };
}

export { emphasis };
