import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a navigation/display list container. Sets `list-style: none` and
 * zero padding; pairs with `listItem` and `listItemButton`. Apply to `<ul>`.
 *
 * @hostTag ul
 * @param props.color - Surface color tone. Optional `ThemeColor`, defaults to `"neutral"`.
 * @example { ul: [...], $: [list()] }
 */
function list(_props: { color?: ThemeColor } = {}): PartialElement {
  return {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
    },
  };
}

/**
 * A non-interactive list row. Typically wraps an icon + text. Apply to `<li>`.
 *
 * @hostTag li
 * @param props.dense - Reduce vertical padding. Optional `boolean`, defaults to `false`.
 * @example { li: "Item", $: [listItem()] }
 */
function listItem(props: { dense?: boolean } = {}): PartialElement {
  const { dense = false } = props;
  return {
    style: {
      display: "flex",
      alignItems: "center",
      gap: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener) =>
        themeSpacing(dense ? 1 : themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text"),
    },
  };
}

/**
 * An interactive (clickable) list row with hover/focus-visible states. Apply
 * to `<button>` or `<a>` inside an `<li>`.
 *
 * @param props.color - Color tone. Optional `ValueOrState<ThemeColor>`, defaults to `"neutral"`.
 * @param props.accentColor - Focus/active accent. Optional `ThemeColor`, defaults to `"primary"`.
 * @param props.dense - Reduce vertical padding. Optional `boolean`, defaults to `false`.
 * @example { button: "Action", $: [listItemButton()] }
 */
function listItemButton(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ThemeColor;
    dense?: boolean;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = props.accentColor ?? "primary";
  const { dense = false } = props;

  return {
    style: {
      cursor: "pointer",
      appearance: "none",
      border: "none",
      background: "transparent",
      textDecoration: "none",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      width: "100%",
      gap: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener) =>
        themeSpacing(dense ? 1 : themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      transition: "background-color 150ms ease, box-shadow 140ms ease",
      "&:hover:not([disabled])": {
        backgroundColor: (listener) =>
          themeColor(listener, "hover", color.get(listener)),
      },
      "&:active:not([disabled])": {
        backgroundColor: (listener) =>
          themeColor(listener, "increase-2", color.get(listener)),
      },
      "&[aria-current=page], &[aria-selected=true]": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-3", accentColor),
        color: (listener) => themeColor(listener, "shift-12", accentColor),
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor),
      },
      "&[disabled]": { opacity: 0.5, cursor: "not-allowed" },
    },
  };
}

export { list, listItem, listItemButton };
