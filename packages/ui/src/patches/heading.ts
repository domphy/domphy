import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

const HeadingShift: Record<string, string> = {
  h6: "decrease-1",
  h5: "inherit",
  h4: "increase-1",
  h3: "increase-2",
  h2: "increase-3",
  h1: "increase-4",
};

/**
 * Styles a heading, scaling its font size by level (h1 largest … h6 smallest)
 * relative to the theme base size. Apply to a heading element `<h1>`–`<h6>`.
 *
 * @hostTag h1
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the heading text. Defaults to "neutral".
 * @example { h2: "Section title", $: [heading()] }
 */
function heading(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (!["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tagName)) {
        console.warn(
          `"heading" primitive patch must use heading tags [h1...h6]`,
        );
      }
    },
    style: {
      color: (listener) =>
        themeColor(listener, "shift-11", color.get(listener)),
      marginTop: 0,
      marginBottom: themeSpacing(2),
      fontSize: (listener) => {
        const offset = HeadingShift[listener.elementNode.tagName] || "inherit";
        return themeSize(listener, offset);
      },
    },
  };
}

export { heading };
