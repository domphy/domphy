import type { PartialElement, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

/**
 * Applies thin, themed overlay scrollbars to any scrollable container.
 * Covers WebKit (Chrome/Safari/Edge) via `::-webkit-scrollbar` pseudo-elements
 * and Firefox via `scrollbar-width`/`scrollbar-color`. Sets `overflow: auto`.
 * No host-tag check; apply to any block element.
 *
 * @param props.color - Theme color for the scrollbar thumb. Accepts a value or
 *   reactive state. Defaults to `"neutral"`.
 * @example { div: [...], style: { maxHeight: "300px" }, $: [scrollArea()] }
 */
function scrollArea(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    style: {
      overflow: "auto",
      // Container text color so theme token usage also carries a reactive `color`.
      color: (l) => themeColor(l, "text", color.get(l)),
      "&::-webkit-scrollbar": {
        width: themeSpacing(2),
        height: themeSpacing(2),
      },
      "&::-webkit-scrollbar-track": {
        background: "transparent",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: (l) => themeColor(l, "shift-5", color.get(l)),
        borderRadius: themeSpacing(999),
        // Transparent border creates visual padding around the thumb.
        border: `${themeSpacing(0.5)} solid transparent`,
        backgroundClip: "content-box",
      },
      "&::-webkit-scrollbar-thumb:hover": {
        backgroundColor: (l) => themeColor(l, "shift-7", color.get(l)),
      },
      // Firefox thin scrollbar with matching thumb/track colors.
      scrollbarWidth: "thin",
      scrollbarColor: (l) =>
        `${themeColor(l, "shift-5", color.get(l))} transparent`,
    } as StyleObject,
  };
}

export { scrollArea };
