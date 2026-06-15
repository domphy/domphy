import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

function image(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    dataTone: "shift-2",
    _onInsert: (node) => {
      if (node.tagName !== "img") {
        console.warn(`"image" primitive patch must use img tag`);
      }
    },
    style: {
      display: "block",
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      objectFit: "cover",
      borderRadius: themeSpacing(2),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
    },
  };
}

export { image };
