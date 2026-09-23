import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeFont,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Renders keyboard-key styling (the theme's monospace stack, themed background,
 * border and padding) for a keystroke hint. Apply to a `<kbd>` element.
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
      // The theme owns the code stack; <code>/<kbd>/<pre> otherwise keep the
      // UA generic "monospace" (Courier New on Windows), so a theme that swaps
      // fontFamilies.monospace never reaches them.
      fontFamily: themeFont("monospace"),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      // Bare themeSpacing(U) at snapshot time; n = U / 1.5 (light.densities[2]).
      paddingBlock: (listener) =>
        themeSpacing(themeDensity(listener) * (0.5 / 1.5)),
      paddingInline: (listener) =>
        themeSpacing(themeDensity(listener) * (1.5 / 1.5)),
      borderRadius: (listener) =>
        themeSpacing(themeDensity(listener) * (1 / 1.5)),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
    },
  };
}

export { keyboard };
