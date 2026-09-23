import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
  themeWeight,
} from "@domphy/theme";

/**
 * Layout patch for a group of form fields. Arranges a `<legend>`, `<label>`s,
 * controls, and helper `<p>`s in a grid — labels beside controls (horizontal)
 * or stacked above them (vertical). Apply to a `<fieldset>` element.
 *
 * @hostTag fieldset
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for legend/text/surface. Defaults to "neutral".
 * @param props.layout - Field arrangement, "horizontal" (label beside control) | "vertical" (label above). Defaults to "horizontal".
 * @example { fieldset: [{ legend: "Profile" }, { label: "Name" }, { input: null }], $: [formGroup({ layout: "vertical" })] }
 */
function formGroup(
  props: {
    color?: ValueOrState<ThemeColor>;
    layout?: "horizontal" | "vertical";
  } = {},
): PartialElement {
  const { layout = "horizontal" } = props;
  const color = toState(props.color ?? "neutral", "color");

  const isVertical = layout === "vertical";

  return {
    _onInsert: (node) => {
      if (node.tagName !== "fieldset") {
        console.warn(`"formGroup" patch must use fieldset tag`);
      }
    },
    style: {
      margin: 0,
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 3),
      border: "none",
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      display: "grid",
      gridTemplateColumns: isVertical
        ? `minmax(0, 1fr)`
        : `max-content minmax(0, 1fr)`,
      columnGap: themeSpacing(4),
      rowGap: themeSpacing(3),
      alignItems: "start",
      "& > legend": {
        gridColumn: "1 / -1",
        margin: 0,
        fontSize: (listener) => themeSize(listener, "inherit"),
        fontWeight: themeWeight("semibold"),
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
        borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "inherit", color.get(listener)),
      },
      "& > label": {
        gridColumn: "1",
        alignSelf: "start",
        margin: 0,
        paddingBlock: (listener) =>
          isVertical ? 0 : themeSpacing(themeDensity(listener) * 1),
      },
      "& > label:has(+ :not(legend, label, p) + p)": {
        gridRow: isVertical ? "auto" : "span 2",
      },
      // Fixed-size controls are EXCLUDED from the stretch rather than
      // overriding it afterwards: a checkbox / switch / radio / colour swatch
      // dropped into a formGroup rendered as a full-column-wide pill
      // (observed in Chromium), and `width: auto` on an appearance:none
      // input collapses it to 0 instead of restoring its declared size.
      "& > :not(legend, label, p, input[type=checkbox], input[type=radio], input[type=color])":
        {
          gridColumn: isVertical ? "1" : "2",
          minWidth: 0,
          width: "100%",
          boxSizing: "border-box",
        },
      "& > input[type=checkbox], & > input[type=radio], & > input[type=color]":
        {
          gridColumn: isVertical ? "1" : "2",
          justifySelf: "start",
        },
      "& > p": {
        gridColumn: isVertical ? "1" : "2",
        minWidth: 0,
        margin: 0,
        marginBlockStart: `calc(${themeSpacing(2)} * -1)`,
        fontSize: (listener) => themeSize(listener, "decrease-1"),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
      },
    },
  };
}

export { formGroup };
