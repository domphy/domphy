import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

/**
 * A thematic break rendered as a thin 1px themed line with vertical margin.
 * Apply to an `<hr>` element.
 *
 * @hostTag hr
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the rule. Defaults to "neutral".
 * @example { hr: "", $: [horizontalRule()] }
 */
function horizontalRule(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "hr") {
        console.warn(`"horizontalRule" primitive patch must use hr tag`);
      }
    },
    // Soft rule surface — edge anchor (shift-3 = border) + inherit paint.
    dataTone: "shift-3",
    style: {
      border: 0,
      height: "1px",
      marginInline: 0,
      marginTop: themeSpacing(3),
      marginBottom: themeSpacing(3),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
    },
  };
}

export { horizontalRule };
