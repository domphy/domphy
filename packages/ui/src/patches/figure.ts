import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Lays out a figure as a column with block-level media (img/svg/video/canvas)
 * and a themed `<figcaption>`. Apply to a `<figure>` element.
 *
 * @hostTag figure
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the figure/caption text. Defaults to "neutral".
 * @example { figure: [{ img: "", src }, { figcaption: "A caption" }], $: [figure()] }
 */
function figure(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "figure") {
        console.warn(`"figure" primitive patch must use figure tag`);
      }
    },
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(2),
      marginInline: 0,
      marginTop: themeSpacing(3),
      marginBottom: themeSpacing(3),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      "& img, & svg, & video, & canvas": {
        display: "block",
        maxWidth: "100%",
        borderRadius: themeSpacing(2),
      },
      "& figcaption": {
        fontSize: (listener) => themeSize(listener, "decrease-1"),
        color: (listener) =>
          themeColor(listener, "shift-8", color.get(listener)),
        lineHeight: 1.45,
      },
    },
  };
}

export { figure };
