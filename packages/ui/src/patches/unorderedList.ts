import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles a bulleted list (disc markers, reset margins, themed text) on the host
 * `<ul>` element.
 *
 * @hostTag ul
 * @param props.color - Theme color for the list text. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @example { ul: null, $: [unorderedList()] }
 */
function unorderedList(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "ul") {
        console.warn(`"unorderedList" primitive patch must use ul tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      marginTop: 0,
      marginBottom: 0,
      paddingLeft: themeSpacing(3),
      listStyleType: "disc",
      listStylePosition: "outside",
    },
  };
}

export { unorderedList };
