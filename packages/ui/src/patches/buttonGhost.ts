import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * A transparent button with no border or background — suitable for icon
 * actions, inline controls, and delete/close triggers. Apply to a `<button>`
 * element.
 *
 * @hostTag button
 * @param props.color - Text color tone. Optional `ValueOrState<ThemeColor>`, defaults to `"neutral"`.
 * @example { button: "×", $: [buttonGhost()] }
 * @example { button: { span: null, $: [icon({ name: "trash" })] }, $: [buttonGhost({ color: "error" })] }
 */
function buttonGhost(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn(`"buttonGhost" primitive patch must use button tag`);
      }
    },
    style: {
      appearance: "none",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      gap: (listener) => themeSpacing(themeDensity(listener) * 1),
      userSelect: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      lineHeight: "inherit",
      border: "none",
      background: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-6", color.get(listener)),
      "&:hover:not([disabled]):not([aria-busy=true])": {
        color: (listener) =>
          themeColor(listener, "shift-9", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", color.get(listener)),
      },
      "&:focus-visible": {
        boxShadow: (listener) =>
          `inset 0 0 0 ${themeSpacing(0.5)} ${themeColor(listener, "shift-6", color.get(listener))}`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-4", "neutral"),
      },
      "&[aria-busy=true]": {
        opacity: 0.7,
        cursor: "wait",
        pointerEvents: "none",
      },
    },
  };
}

export { buttonGhost };
