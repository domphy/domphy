import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { BUTTON_SIZE_FONT, type ButtonSize } from "../utils/buttonSize.js";
import { focusRing } from "../utils/focusRing.js";

const PADDING_STEPS: Record<ButtonSize, number> = {
  small: 0.5,
  medium: 1,
  large: 1.5,
};

/**
 * A transparent button with no border or background — suitable for icon
 * actions, inline controls, and delete/close triggers. Apply to a `<button>`
 * element.
 *
 * @hostTag button
 * @param props.color - Text color tone. Optional `ValueOrState<ThemeColor>`, defaults to `"neutral"`.
 * @param props.size - Button size preset. Optional `"small" | "medium" | "large"`, defaults to `"medium"`.
 * @example { button: "×", $: [buttonGhost()] }
 * @example { button: { span: null, $: [icon({ name: "trash" })] }, $: [buttonGhost({ color: "error" })] }
 */
function buttonGhost(
  props: { color?: ValueOrState<ThemeColor>; size?: ButtonSize } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const padding = PADDING_STEPS[props.size ?? "medium"];
  const fontSize = BUTTON_SIZE_FONT[props.size ?? "medium"];

  return {
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn(`"buttonGhost" primitive patch must use button tag`);
      }
    },
    style: {
      appearance: "none",
      fontSize: (listener) => themeSize(listener, fontSize),
      paddingBlock: (listener) =>
        themeSpacing(themeDensity(listener) * padding),
      paddingInline: (listener) =>
        themeSpacing(themeDensity(listener) * padding),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
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
      transition:
        "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
      color: (listener) => themeColor(listener, "shift-6", color.get(listener)),
      "&:hover:not([disabled]):not([aria-busy=true])": {
        color: (listener) => themeColor(listener, "text", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "hover", color.get(listener)),
      },
      "&:active:not([disabled]):not([aria-busy=true])": {
        color: (listener) => themeColor(listener, "text", color.get(listener)),
        backgroundColor: (listener) =>
          themeColor(listener, "increase-2", color.get(listener)),
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, color.get(listener)),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "border-strong", "neutral"),
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
