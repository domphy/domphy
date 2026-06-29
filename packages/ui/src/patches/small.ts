import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

/**
 * Styles small/secondary text: one step smaller font size (`data-size="decrease-1"`) with a
 * themed foreground color.
 *
 * @hostTag small
 * @param props.color - Theme color tone for the text. Accepts a value or reactive state.
 *   Defaults to `"neutral"`.
 * @example { small: "fine print", $: [small()] }
 */
function small(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "small") {
        console.warn('"small" patch must use small tag');
      }
    },
    dataSize: "decrease-1",
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
    },
  };
}

export { small };
