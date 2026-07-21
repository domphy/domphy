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
import type { ButtonVariant } from "./button.js";

const PADDING_STEPS: Record<ButtonSize, { block: number; inline: number }> = {
  small: { block: 0.5, inline: 2 },
  medium: { block: 1, inline: 3 },
  large: { block: 1.5, inline: 4 },
};

const GHOST_PADDING: Record<ButtonSize, number> = {
  small: 0.5,
  medium: 1,
  large: 1.5,
};

/**
 * An `<a>` element styled to look like a button — same visual system as
 * `button()` (`variant` / `size` / color) while preserving link semantics
 * (href, middle-click, right-click). Apply to an `<a>` element.
 *
 * @hostTag a
 * @param props.color - Button color tone. Optional `ValueOrState<ThemeColor>`, default "primary".
 * @param props.variant - `"outline"` (default) | `"solid"` | `"ghost"` — matches `button()`.
 * @param props.size - `"small" | "medium" | "large"`, defaults to `"medium"`.
 * @example { a: "Open app", href: "/app", $: [linkButton({ color: "primary" })] }
 * @example { a: "Get started", href: "/start", $: [linkButton({ variant: "solid" })] }
 */
function linkButton(
  props: {
    color?: ValueOrState<ThemeColor>;
    variant?: ButtonVariant;
    size?: ButtonSize;
  } = {},
): PartialElement {
  const variant = props.variant ?? "outline";
  const color = toState(
    props.color ?? (variant === "ghost" ? "neutral" : "primary"),
    "color",
  );
  const size = props.size ?? "medium";
  const fontSize = BUTTON_SIZE_FONT[size];

  if (variant === "ghost") {
    const padding = GHOST_PADDING[size];
    return {
      _onInsert: (node) => {
        if (node.tagName !== "a") {
          console.warn(`"linkButton" primitive patch must use a tag`);
        }
      },
      style: {
        fontSize: (listener) => themeSize(listener, fontSize),
        textDecoration: "none",
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
        color: (listener) =>
          themeColor(listener, "shift-6", color.get(listener)),
        "&:hover:not([aria-disabled=true])": {
          color: (listener) =>
            themeColor(listener, "text", color.get(listener)),
          backgroundColor: (listener) =>
            themeColor(listener, "hover", color.get(listener)),
          textDecoration: "none",
        },
        "&:active:not([aria-disabled=true])": {
          color: (listener) =>
            themeColor(listener, "text", color.get(listener)),
          backgroundColor: (listener) =>
            themeColor(listener, "increase-2", color.get(listener)),
        },
        "&:focus-visible": {
          boxShadow: (listener) => focusRing(listener, color.get(listener)),
        },
        "&[aria-disabled=true]": {
          opacity: 0.7,
          cursor: "not-allowed",
          pointerEvents: "none",
          color: (listener) => themeColor(listener, "border-strong", "neutral"),
        },
      },
    };
  }

  const isSolid = variant === "solid";
  const padding = PADDING_STEPS[size];

  return {
    _onInsert: (node) => {
      if (node.tagName !== "a") {
        console.warn(`"linkButton" primitive patch must use a tag`);
      }
    },
    ...(isSolid
      ? {
          _doctorDisable: [
            "low-contrast",
            "color-shift-minimum",
            "tone-background-inherit",
          ] as const,
        }
      : {}),
    style: {
      fontSize: (listener) => themeSize(listener, fontSize),
      textDecoration: "none",
      paddingBlock: (listener) =>
        themeSpacing(themeDensity(listener) * padding.block),
      paddingInline: (listener) =>
        themeSpacing(themeDensity(listener) * padding.inline),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      width: "fit-content",
      display: "inline-flex",
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
      // Solid: deep brand (shift-13) + light-end text (not mid-ramp ~2.2:1).
      // Outline: shift-13 for ≥4.5:1 on light bg.
      color: (listener) =>
        isSolid
          ? themeColor(listener, "shift-0", "neutral")
          : themeColor(listener, "shift-13", color.get(listener)),
      backgroundColor: (listener) =>
        isSolid
          ? themeColor(listener, "shift-13", color.get(listener))
          : themeColor(listener, "inherit", color.get(listener)),
      transition:
        "background-color 140ms ease, color 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
      "&:hover:not([aria-disabled=true])": {
        textDecoration: "none",
        color: (listener) =>
          isSolid
            ? themeColor(listener, "shift-0", "neutral")
            : themeColor(listener, "shift-14", color.get(listener)),
        backgroundColor: (listener) =>
          isSolid
            ? themeColor(listener, "shift-14", color.get(listener))
            : themeColor(listener, "hover", color.get(listener)),
      },
      "&:active:not([aria-disabled=true])": {
        backgroundColor: (listener) =>
          isSolid
            ? themeColor(listener, "shift-15", color.get(listener))
            : themeColor(listener, "increase-2", color.get(listener)),
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, color.get(listener)),
      },
      "&[aria-disabled=true]": {
        opacity: 0.7,
        cursor: "not-allowed",
        pointerEvents: "none",
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        color: (listener) => themeColor(listener, "muted", "neutral"),
      },
    },
  };
}

export { linkButton };
