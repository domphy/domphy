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
 * Styles a preformatted text block: inherited font size, the theme's monospace
 * stack, themed foreground/background,
 * no border, density-scaled padding and rounded corners.
 *
 * @hostTag pre
 * @param props.color - Theme color tone for text and background. Accepts a value or reactive
 *   state. Defaults to `"neutral"`.
 * @example { pre: "const x = 1", $: [preformated()] }
 */
function preformated(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    dataTone: "shift-2",
    _onInsert: (node) => {
      if (node.tagName !== "pre") {
        console.warn(`"preformated" primitive patch must use pre tag`);
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
      border: "none",
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };
}

export { preformated };
