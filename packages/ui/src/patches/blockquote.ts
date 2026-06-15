import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles a quotation block with a colored inset side bar, padded surface, and
 * shifted tone. Apply to a `<blockquote>` element.
 *
 * @hostTag blockquote
 * @param props.color - Surface/bar color tone. Optional `ValueOrState<ThemeColor>`, default "inherit".
 * @example { blockquote: "Design is how it works.", $: [blockquote({ color: "primary" })] }
 */
function blockquote(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "inherit", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "blockquote") {
        console.warn(`"blockquote" primitive patch must use blockquote tag`);
      }
    },
    dataTone: "shift-2",
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      boxShadow: (listener) =>
        `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-4", color.get(listener))}`,
      border: "none",
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
      margin: 0,
    },
  };
}

export { blockquote };
