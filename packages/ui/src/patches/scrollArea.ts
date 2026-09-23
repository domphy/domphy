import type { PartialElement, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

/**
 * Applies thin, themed overlay scrollbars to any scrollable container.
 * Covers WebKit (Chrome/Safari/Edge) via `::-webkit-scrollbar` pseudo-elements
 * and Firefox via `scrollbar-width`/`scrollbar-color`. Sets `overflow: auto`.
 * No host-tag check; apply to any block element.
 *
 * Pass `label` when the scrollable content is NOT itself keyboard-reachable —
 * a wide table, a code block, a diagram. Such a region can only be scrolled
 * with a pointer, which fails WCAG 2.1.1 (axe `scrollable-region-focusable`),
 * so `label` makes the host a named, tabbable region: `role="region"` +
 * `aria-label` + `tabindex="0"`, the wrapper pattern GOV.UK and shadcn use
 * around overflowing tables. Leave it off when the content already holds
 * focusable elements (a nav list, a form) — those are reachable by Tab
 * already, and a region tab stop in front of them is one keystroke of noise
 * per list.
 *
 * @param props.color - Theme color for the scrollbar thumb. Accepts a value or
 *   reactive state. Defaults to `"neutral"`.
 * @param props.label - Accessible name for the scroll region. Setting it makes
 *   the host a tabbable `role="region"`. Optional; a host-declared
 *   `role`/`ariaLabel`/`tabIndex` still wins (native over patch).
 * @example { div: [...], style: { maxHeight: "300px" }, $: [scrollArea()] }
 * @example { div: [wideTable], $: [scrollArea({ label: "Quarterly revenue" })] }
 */
function scrollArea(
  props: { color?: ValueOrState<ThemeColor>; label?: string } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    // `role="region"` with no accessible name is dropped from the
    // accessibility tree, and a tab stop with no name is a dead end — so the
    // three only ever ship together, or not at all.
    ...(props.label
      ? { role: "region", ariaLabel: props.label, tabIndex: 0 }
      : {}),
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
