import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ElementSize,
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

const HeadingShift: Record<string, ElementSize> = {
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
 * @hostTag h1-h6
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the heading text. Defaults to "neutral".
 * @param props.size - Optional `ElementSize` (`"inherit"` | `"increase-N"` | `"decrease-N"`, N ≤ 7). When set, font size is `themeSize(listener, size)` including `"inherit"` (no tag bump). When omitted, follows the host tag (`h1` increase-4 … `h6` decrease-1).
 * @example { h2: "Section title", $: [heading()] }
 * @example { h3: "Panel title", $: [heading({ size: "inherit" })] }
 */
function heading(
  props: { color?: ValueOrState<ThemeColor>; size?: ElementSize } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const size = props.size;

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
        if (size !== undefined) {
          return themeSize(listener, size);
        }
        const offset = HeadingShift[listener.elementNode.tagName] || "inherit";
        return themeSize(listener, offset);
      },
    },
  };
}

export { heading };
