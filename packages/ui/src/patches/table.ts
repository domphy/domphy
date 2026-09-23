import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  textToneOn,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
  themeWeight,
} from "@domphy/theme";

/**
 * Styles a data table (header/body/footer cells, caption, row hover, borders)
 * on the host `<table>` element.
 *
 * @hostTag table
 * @param props.color - Theme color applied across cells and text. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @example { table: null, $: [table()] }
 */
function table(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "table") {
        console.warn(`"table" primitive patch must use table tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      width: "100%",
      borderCollapse: "collapse",
      "& caption": {
        captionSide: "bottom",
      },
      "& th, & thead td": {
        textAlign: "start",
        fontWeight: themeWeight("medium"),
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        backgroundColor: (listener) => themeColor(listener, "inherit"),
      },
      "& td": {
        textAlign: "start",
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
        boxShadow: (listener) =>
          `inset 0 1px 0 ${themeColor(listener, "shift-3", color.get(listener))}`,
        fontSize: (listener) => themeSize(listener, "inherit"),
      },
      "& tfoot th, & tfoot td": {
        textAlign: "start",
        fontWeight: themeWeight("medium"),
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
        color: (l) => themeColor(l, "shift-10", color.get(l)),
        backgroundColor: (l) => themeColor(l, "inherit"),
        boxShadow: (l) =>
          `inset 0 -1px 0 ${themeColor(l, "shift-4", color.get(l))}`,
      },
      "& tr": {
        backgroundColor: (listener) => themeColor(listener, "inherit"),
      },

      // No !important needed: ".scope tbody tr:hover" (two classes + two
      // elements) already out-specifies any row's own auto-scope class rule.
      "& tbody tr:hover": {
        backgroundColor: (listener) => themeColor(listener, "hover"),
        color: (listener) => themeColor(listener, textToneOn(2)),
      },
      // Cell text tracks the hover fill (+2) — measured in Chromium (axe
      // color-contrast) at 3.57:1 light / 4.37:1 dark while the cells kept the
      // resting "text" tone. It has to be set on the CELLS: `& td` declares its
      // own `color`, and a direct declaration beats anything inherited from the
      // row however specific that row's selector is.
      "& tbody tr:hover td, & tbody tr:hover th": {
        color: (listener) => themeColor(listener, textToneOn(2)),
      },
    },
  };
}

export { table };
