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
import { buttonGhost } from "./buttonGhost.js";

type ButtonVariant = "solid" | "outline" | "ghost";

const PADDING_STEPS: Record<ButtonSize, { block: number; inline: number }> = {
  small: { block: 0.5, inline: 2 },
  medium: { block: 1, inline: 3 },
  large: { block: 1.5, inline: 4 },
};

/**
 * A themed button control with density-aware padding/radius and hover, pressed
 * (`:active` ±2), focus-visible, `[disabled]`, and `[aria-busy=true]` states.
 * Apply to a `<button>` element.
 *
 * @hostTag button
 * @param props.color - Button color tone. Optional `ValueOrState<ThemeColor>`, default "primary".
 * @param props.variant - Visual style: `"outline"` (tinted background + outline, default,
 *   backward compatible), `"solid"` (filled background, readable contrast text), or `"ghost"`
 *   (no background/border — delegates to `buttonGhost()` so the two stay visually identical).
 * @param props.size - Button size preset. Optional `"small" | "medium" | "large"`, defaults to `"medium"`.
 * @example { button: "Save", $: [button({ color: "primary" })] }
 * @example { button: "Delete", $: [button({ color: "error", variant: "solid" })] }
 */
function button(
  props: {
    color?: ValueOrState<ThemeColor>;
    variant?: ButtonVariant;
    size?: ButtonSize;
  } = {},
): PartialElement {
  const variant = props.variant ?? "outline";
  if (variant === "ghost") {
    return buttonGhost({ color: props.color, size: props.size });
  }

  const color = toState(props.color ?? "primary", "color");
  const isSolid = variant === "solid";
  const padding = PADDING_STEPS[props.size ?? "medium"];
  const fontSize = BUTTON_SIZE_FONT[props.size ?? "medium"];

  return {
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn(`"button" primitive patch must use button tag`);
      }
    },
    // Solid fills use the dark edge (shift-17) + light text (shift-0).
    // Inverse solid controls intentionally invert doctor body-text contrast rules.
    ...(isSolid
      ? {
          dataTone: "shift-17" as const,
          _doctorDisable: ["low-contrast", "color-shift-minimum"] as const,
        }
      : {}),
    style: {
      appearance: "none",
      fontSize: (listener) => themeSize(listener, fontSize),
      // Single-line bounded control: block/radius = 1D, inline = 3D.
      paddingBlock: (listener) =>
        themeSpacing(themeDensity(listener) * padding.block),
      paddingInline: (listener) =>
        themeSpacing(themeDensity(listener) * padding.inline),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      width: "fit-content",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: (listener) => themeSpacing(themeDensity(listener) * 1),
      userSelect: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      lineHeight: "inherit",
      border: "none",
      outlineOffset: "-1px",
      outlineWidth: "1px",
      outline: isSolid
        ? "none"
        : (listener) =>
            `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      color: (listener) =>
        isSolid
          ? themeColor(listener, "shift-0", color.get(listener))
          : themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      transition:
        "background-color 140ms ease, color 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
      "&:hover:not([disabled]):not([aria-busy=true])": {
        color: (listener) =>
          isSolid
            ? themeColor(listener, "shift-0", color.get(listener))
            : themeColor(listener, "shift-10", color.get(listener)),
        backgroundColor: (listener) =>
          isSolid
            ? themeColor(listener, "decrease-1", color.get(listener))
            : themeColor(listener, "hover", color.get(listener)),
      },
      // Pressed: ±2 from surface (design system interactive delta).
      "&:active:not([disabled]):not([aria-busy=true])": {
        backgroundColor: (listener) =>
          isSolid
            ? themeColor(listener, "decrease-2", color.get(listener))
            : themeColor(listener, "increase-2", color.get(listener)),
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, color.get(listener)),
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        color: (listener) => themeColor(listener, "muted", "neutral"),
      },
      "&[aria-busy=true]": {
        opacity: 0.7,
        cursor: "wait",
        pointerEvents: "none",
      },
    },
  };
}

export { button };
export type { ButtonVariant };
