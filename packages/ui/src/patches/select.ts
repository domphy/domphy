import type { Listener, PartialElement } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeColorToken,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a native `<select>` control: removes the default appearance, applies themed
 * colors, outline, density-scaled padding/radius, a custom chevron background icon, and
 * hover/focus/disabled/optgroup/option states.
 *
 * @hostTag select
 * @param props.color - Theme color tone for text, background and outline. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color tone for hover/focus outlines. Defaults to `"primary"`.
 * @example { select: [{ option: "A" }], $: [select()] }
 */
function select(
  props: { color?: ThemeColor; accentColor?: ThemeColor } = {},
): PartialElement {
  const { color = "neutral", accentColor = "primary" } = props;

  return {
    _onInsert: (node) => {
      if (node.tagName !== "select") {
        console.warn(`"select" primitive patch must use select tag`);
      }
    },
    style: {
      appearance: "none",
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "text", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color)}`,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingLeft: (listener) => themeSpacing(themeDensity(listener) * 3),
      paddingRight: (listener) => themeSpacing(themeDensity(listener) * 5),
      backgroundImage: (l: Listener) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="${themeColorToken(l, "shift-7")}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      },
      backgroundRepeat: "no-repeat",
      backgroundPosition: `right ${themeSpacing(2)} center`,
      backgroundSize: `${themeSpacing(2.5)} ${themeSpacing(1.5)}`,
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      "&:not([multiple])": {
        height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-5", accentColor)}`,
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor),
      },
      "& optgroup": {
        color: (listener) => themeColor(listener, "shift-11", color),
      },
      "& option[disabled]": {
        color: (listener) => themeColor(listener, "shift-7", "neutral"),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
      },
    },
  };
}

export { select };
