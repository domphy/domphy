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
      // shift-10 (not muted/shift-8) keeps WCAG AA ≥4.5:1 on light surfaces for small type.
      color: (listener) =>
        themeColor(listener, "shift-10", color.get(listener)),
    },
  };
}

export { small };
