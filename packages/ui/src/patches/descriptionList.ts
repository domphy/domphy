import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles a description list as a two-column grid (terms in the first column,
 * descriptions in the second), theming the nested `<dt>`/`<dd>` elements.
 * Apply to a `<dl>` element.
 *
 * @hostTag dl
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the term/description text. Defaults to "neutral".
 * @example { dl: [{ dt: "Name" }, { dd: "Domphy" }], $: [descriptionList()] }
 */
function descriptionList(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "dl") {
        console.warn(`"descriptionList" primitive patch must use dl tag`);
      }
    },
    // Term weight is design-system chrome for description lists.
    _doctorDisable: "inline-typography",
    style: {
      display: "grid",
      gridTemplateColumns: `minmax(${themeSpacing(24)}, max-content) 1fr`,
      columnGap: themeSpacing(4),
      margin: 0,
      "& dt": {
        margin: 0,
        fontWeight: 600,
        fontSize: (listener) => themeSize(listener, "inherit"),
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
      },
      "& dd": {
        margin: 0,
        fontSize: (listener) => themeSize(listener, "inherit"),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
      },
    },
  };
}

export { descriptionList };
