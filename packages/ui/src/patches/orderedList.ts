import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Themed ordered-list primitive: decimal markers positioned outside, reset
 * margins and themed text color. Apply to an `<ol>` element.
 *
 * @hostTag ol
 * @param props - Optional configuration.
 * @param props.color - Color tone for the list text. Defaults to `"neutral"`.
 * @example { ol: "", $: [orderedList()], children: [{ li: "First" }] }
 */
function orderedList(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "ol") {
        console.warn(`"orderedList" primitive patch must use ol tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      marginTop: 0,
      marginBottom: 0,
      paddingLeft: themeSpacing(3),
      listStyleType: "decimal",
      listStylePosition: "outside",
    },
  };
}

export { orderedList };
