import type { Listener, PartialElement } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeColorToken,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { isRTL } from "../utils/direction.js";
import { edge } from "../utils/edge.js";
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
  // The edge is a box-shadow (`edge()`): an outline draws square corners before Chrome 94.
  // Hover's selector outranks `:focus-visible`, so a hovered focused select needs
  // its own `focusRing, edge` rule or the hover edge would erase the ring.
  const baseEdge = (l: Listener) => edge(themeColor(l, "border-strong", color));
  const hoverEdge = (l: Listener) =>
    edge(themeColor(l, "shift-5", accentColor));
  const focused = (l: Listener, edgeValue: string) =>
    `${focusRing(l, accentColor)}, ${edgeValue}`;

  return {
    _onInsert: (node) => {
      if (node.tagName !== "select") {
        console.warn(`"select" primitive patch must use select tag`);
      }
    },
    style: {
      appearance: "none",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "text", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      outline: "none",
      boxShadow: baseEdge,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInlineStart: (listener) =>
        themeSpacing(themeDensity(listener) * 3),
      paddingInlineEnd: (listener) => themeSpacing(themeDensity(listener) * 5),
      backgroundImage: (l: Listener) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="${themeColorToken(l, "shift-7")}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      },
      backgroundRepeat: "no-repeat",
      // background-position has no logical ("inline-end") keyword support in
      // Chrome 88-class embedded browsers, so the physical side is picked at
      // paint time from the resolved CSS `direction` (same technique
      // @domphy/floating's platform.isRTL uses) instead of a fixed "right".
      backgroundPosition: (l: Listener) =>
        `${isRTL(l.elementNode?.domElement) ? "left" : "right"} ${themeSpacing(2)} center`,
      backgroundSize: `${themeSpacing(2.5)} ${themeSpacing(1.5)}`,
      transition: "box-shadow 140ms ease",
      // No height floor: a form control is sized by its line box plus its own
      // paddingBlock, the shape inputText/inputNumber/inputSearch and every
      // button use, so a select standing in a toolbar row is exactly as tall as
      // its neighbours. A floor here made it 1U taller than all of them.
      "&:hover:not([disabled]):not([aria-busy=true])": {
        boxShadow: hoverEdge,
      },
      "&:focus-visible": {
        boxShadow: (l) => focused(l, baseEdge(l)),
      },
      "&:hover:not([disabled]):not([aria-busy=true]):focus-visible": {
        boxShadow: (l) => focused(l, hoverEdge(l)),
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
        boxShadow: (listener) =>
          edge(themeColor(listener, "border-strong", "neutral")),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
      },
    },
  };
}

export { select };
