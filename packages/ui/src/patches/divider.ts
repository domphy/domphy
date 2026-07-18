import type { PartialElement } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * A horizontal separator (`role="separator"`) with a line on each side of its
 * content, suitable for labelled dividers ("or"). Apply to a `<div>` element.
 *
 * @hostTag div
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the label text and rules. Defaults to "neutral".
 * @example { div: "or", $: [divider()] }
 */
function divider(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    role: "separator",
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"divider" patch should be used with <div>`);
      }
    },
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "baseline",
      gap: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      minHeight: "1lh",
      "&::before": {
        content: `""`,
        flex: 1,
        borderColor: (listener) =>
          themeColor(listener, "border-strong", color.get(listener)),
        borderWidth: "1px",
        borderBottomStyle: "solid",
      },
      "&::after": {
        content: `""`,
        flex: 1,
        borderColor: (listener) =>
          themeColor(listener, "border-strong", color.get(listener)),
        borderWidth: "1px",
        borderBottomStyle: "solid",
      },
    },
  };
}

export { divider };
