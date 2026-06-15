import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

function superscript(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName != "sup") {
        console.warn(`"superscript" primitive patch must use sup tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      verticalAlign: "super",
      lineHeight: 0,
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
    },
  };
}

export { superscript };
