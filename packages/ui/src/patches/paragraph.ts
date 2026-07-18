import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

/**
 * Themed paragraph primitive: comfortable line-height, reset margins and themed
 * text color. Apply to a `<p>` element.
 *
 * @hostTag p
 * @param props - Optional configuration.
 * @param props.color - Color tone for the paragraph text. Defaults to `"neutral"`.
 * @example { p: "Hello world", $: [paragraph()] }
 */
function paragraph(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "p") {
        console.warn(`"paragraph" primitive patch must use p tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      lineHeight: 1.5,
      marginTop: 0,
      marginBottom: 0,
    },
  };
}

export { paragraph };
