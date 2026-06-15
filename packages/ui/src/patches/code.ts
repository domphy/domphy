import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles an inline code snippet with a subtle surface background, rounded corners,
 * and shifted tone. Apply to a `<code>` element.
 *
 * @hostTag code
 * @param props.color - Surface/text color tone. Optional `ValueOrState<ThemeColor>`, default "neutral".
 * @example { code: "npm install", $: [code({ color: "neutral" })] }
 */
function code(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    dataTone: "shift-2",
    _onInsert: (node) => {
      if (node.tagName !== "code") {
        console.warn(`"code" primitive patch must use code tag`);
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      height: themeSpacing(6),
      paddingInline: themeSpacing(1.5),
      borderRadius: themeSpacing(1),
    },
  };
}

export { code };
