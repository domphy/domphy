import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { elevation } from "../utils/elevation.js";
import { focusRing } from "../utils/focusRing.js";

const SIZE_MAP = { small: 8, medium: 10, large: 14 } as const;

/**
 * Floating Action Button — a circular elevated button typically used for the
 * primary action on a screen. Apply to a `<button>` element.
 *
 * @hostTag button
 * @param props.color - Button color tone. Optional `ValueOrState<ThemeColor>`, defaults to `"primary"`.
 * @param props.size - Button size preset. Optional `"small" | "medium" | "large"`, defaults to `"medium"`.
 * @example { button: "+", $: [fab()] }
 * @example { button: "+", $: [fab({ size: "small", color: "neutral" })] }
 */
function fab(
  props: {
    color?: ValueOrState<ThemeColor>;
    size?: "small" | "medium" | "large";
  } = {},
): PartialElement {
  const color = toState(props.color ?? "primary", "color");
  const dim = themeSpacing(SIZE_MAP[props.size ?? "medium"]);

  return {
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn('"fab" patch must use button tag');
      }
    },
    // Mid-ramp brand disc + light icon (not dataTone-17 black — visual catalog).
    // tone-background-inherit wants inherit+dataTone; solid brand fill needs
    // an explicit shift-8 so doctor is silenced the same way as button solid.
    _doctorDisable: [
      "low-contrast",
      "color-shift-minimum",
      "tone-background-inherit",
    ],
    style: {
      appearance: "none",
      border: "none",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: dim,
      height: dim,
      borderRadius: "50%",
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) =>
        themeColor(listener, "shift-8", color.get(listener)),
      color: (listener) => themeColor(listener, "shift-0", "neutral"),
      boxShadow: elevation("low"),
      transition: "background-color 200ms ease, box-shadow 200ms ease",
      "&:hover:not([disabled])": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-9", color.get(listener)),
        boxShadow: elevation("medium"),
      },
      "&:active:not([disabled])": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        boxShadow: elevation("low"),
      },
      "&:focus-visible": {
        boxShadow: (listener) =>
          `${elevation("medium")}, ${focusRing(listener, color.get(listener))}`,
      },
      "&[disabled]": { opacity: 0.5, cursor: "not-allowed" },
    },
  };
}

export { fab };
