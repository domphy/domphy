import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Renders keyboard-key styling (themed background, border and padding) for a
 * keystroke hint. Apply to a `<kbd>` element.
 *
 * @hostTag kbd
 * @param props - Optional configuration.
 * @param props.color - Color tone for text/background/border. Defaults to `"neutral"`.
 * @example { kbd: "Ctrl", $: [keyboard()] }
 */
function keyboard(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "kbd") {
        console.warn(`"keyboard" primitive patch must use kbd tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 0.5),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
    },
  };
}

export { keyboard };
