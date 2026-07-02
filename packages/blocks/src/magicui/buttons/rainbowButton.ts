// Magic UI "Rainbow Button" — clean-room reimplementation.
//
// A pill-shaped call-to-action whose fill is a multi-hue gradient that pans
// continuously sideways, with a blurred duplicate of the same gradient
// sitting behind the shape as a soft colorful glow. Implemented purely from
// the block's public functional/visual spec — no upstream Magic UI source
// was viewed or copied.
//
// Technique: the gradient is painted at 200% background-size and a
// linear-infinite keyframe animates `backgroundPosition` from "0% 50%" to
// "200% 50%" — since the animation's end offset matches the oversized
// background-size, the pattern tiles seamlessly with no visible seam (the
// same relationship `animatedGradientText.ts` already uses at 300%/300%).
// The glow is the identical gradient rendered on a second, larger, heavily
// blurred layer placed BEHIND the button in DOM order inside a shared
// `position: relative` wrapper (per the block's own domSketch) rather than
// via a negative z-index trick on the button itself, so it never fights the
// button's own stacking context.
//
// The upstream spec's rainbow is five literal hues (red/violet/blue/cyan/
// yellow-green). Domphy's doctor rules forbid raw hex/rgb color literals on
// style props, and this theme has no dedicated violet family, so the
// gradient stops are five `ThemeColor` roles instead, chosen to approximate
// that hue spread: "error" (red) → "secondary" (this theme's rose/magenta —
// the closest built-in role to violet, same substitution `animatedGradientText`
// documents) → "primary" (blue) → "info" (cyan) → "success" (yellow-green).
// This keeps the sweep fully theme-aware (it follows light/dark theme swaps)
// at the cost of not accepting an arbitrary caller-supplied hex list.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export type RainbowButtonVariant = "default" | "outline";
export type RainbowButtonSize = "sm" | "default" | "lg" | "icon";

export interface RainbowButtonProps {
  /** Button label content. Defaults to `"Get unlimited access"`. */
  children?: DomphyElement | DomphyElement[] | string;
  /** `"default"` fills the whole face with the animated gradient; `"outline"` keeps a
   * neutral flat interior and only rings the border with the animated gradient. Defaults
   * to `"default"`. */
  variant?: RainbowButtonVariant;
  /** Standard button size preset. Defaults to `"default"`. */
  size?: RainbowButtonSize;
  /** Gradient stops the sweep pans through, in order. Defaults to a five-hue rainbow
   * approximation: `["error", "secondary", "primary", "info", "success"]`. */
  colors?: ThemeColor[];
  /** One full pan cycle, in seconds. Defaults to `3`. */
  duration?: number;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  style?: StyleObject;
}

const DEFAULT_RAINBOW_COLORS: ThemeColor[] = ["error", "secondary", "primary", "info", "success"];

interface RainbowButtonSizing {
  paddingBlockUnits: number;
  paddingInlineUnits: number;
  fontSizeTone: "decrease-1" | "inherit" | "increase-1";
  square?: boolean;
}

const RAINBOW_BUTTON_SIZES: Record<RainbowButtonSize, RainbowButtonSizing> = {
  sm: { paddingBlockUnits: 0.75, paddingInlineUnits: 2.5, fontSizeTone: "decrease-1" },
  default: { paddingBlockUnits: 1, paddingInlineUnits: 3, fontSizeTone: "inherit" },
  lg: { paddingBlockUnits: 1.5, paddingInlineUnits: 5, fontSizeTone: "increase-1" },
  icon: { paddingBlockUnits: 1, paddingInlineUnits: 1, fontSizeTone: "inherit", square: true },
};

let rainbowButtonInstanceCounter = 0;

/** Normalizes a `DomphyElement | DomphyElement[] | string` prop into the flat
 * `(string | DomphyElement)[]` shape `DomphyElement<T>`'s content field expects — a
 * bare single element isn't part of that type, only primitives/arrays/functions are. */
function asContent(value: DomphyElement | DomphyElement[] | string): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * A pill-shaped hero/CTA button filled (or, in `"outline"` mode, ringed) with a
 * continuously panning multi-hue gradient, backed by a soft blurred duplicate of the
 * same gradient acting as a colorful ambient glow. The pan animation is fully ambient —
 * it loops from mount with no interaction required, while hover/press layer ordinary
 * button feedback on top. Call with no arguments for a working demo button.
 */
function rainbowButton(props: RainbowButtonProps = {}): DomphyElement<"div"> {
  const label = props.children ?? "Get unlimited access";
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";
  const colors = props.colors && props.colors.length > 0 ? props.colors : DEFAULT_RAINBOW_COLORS;
  const duration = props.duration ?? 3;
  const sizing = RAINBOW_BUTTON_SIZES[size];

  const instanceId = ++rainbowButtonInstanceCounter;
  const animationName = `rainbow-button-flow-${hashString(
    JSON.stringify({ instanceId, colors, duration }),
  )}`;
  const flowKeyframes = {
    from: { backgroundPosition: "0% 50%" },
    to: { backgroundPosition: "200% 50%" },
  };
  const flowAnimation = `${animationName} ${duration}s linear infinite`;

  // Builds the comma-separated stop list, repeating the first color at the end so the
  // 200%-wide tiled pattern loops with no visible seam.
  const gradientStops = (listener: Listener): string => {
    const stops = colors.map((color) => themeColor(listener, "shift-8", color));
    stops.push(themeColor(listener, "shift-8", colors[0]));
    return stops.join(", ");
  };

  const isOutline = variant === "outline";

  const fillStyle = isOutline
    ? {
        // Classic dual-background-layer "gradient border" trick: an opaque neutral
        // layer clipped to the padding-box sits over an animated gradient layer
        // clipped to the border-box, so only a thin ring of the gradient shows.
        backgroundImage: (listener: Listener) =>
          `linear-gradient(${themeColor(listener, "inherit", "neutral")}, ${themeColor(listener, "inherit", "neutral")}), linear-gradient(90deg, ${gradientStops(listener)})`,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        backgroundSize: "auto, 200% 100%",
        backgroundRepeat: "no-repeat, repeat",
        border: "2px solid transparent",
        color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
        animation: flowAnimation,
        [`@keyframes ${animationName}`]: flowKeyframes,
      }
    : {
        backgroundImage: (listener: Listener) => `linear-gradient(90deg, ${gradientStops(listener)})`,
        backgroundSize: "200% 100%",
        color: (listener: Listener) => themeColor(listener, "shift-0", "neutral"),
        animation: flowAnimation,
        [`@keyframes ${animationName}`]: flowKeyframes,
      };

  // Decorative blurred halo behind the button — same panning gradient, enlarged,
  // heavily blurred and dimmed, offset slightly downward to fake a colored drop-shadow.
  // `_doctorDisable` isn't part of core's strict `PartialElement` type — build through
  // an untyped literal, then assert, so the excess-property check doesn't fire (mirrors
  // `overlayCanvas` in confetti.ts).
  const glowLayer = {
    span: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      // Enlarged more at the sides/bottom than the top, and blurred, so the halo
      // reads as a soft colorful drop-shadow rather than a symmetric outline.
      top: "0",
      left: "-6px",
      right: "-6px",
      bottom: "-10px",
      borderRadius: "inherit",
      backgroundImage: (listener: Listener) => `linear-gradient(90deg, ${gradientStops(listener)})`,
      backgroundSize: "200% 100%",
      filter: "blur(20px)",
      opacity: 0.65,
      zIndex: -1,
      animation: flowAnimation,
      [`@keyframes ${animationName}`]: flowKeyframes,
    } as StyleObject,
  } as DomphyElement<"span">;

  // Hand-rolls the button chrome instead of composing the `button()` patch: that
  // patch owns `backgroundColor`/`outline` keyed off a single `color` prop, which
  // would fight the multi-stop animated gradient fill/ring that IS this component's
  // entire visual identity (same tradeoff `borderBeam`/`shineBorder` make for their
  // own bespoke container chrome). The density-aware padding/radius formula and
  // interaction states are reproduced by hand below to stay consistent with it.
  const buttonElement: DomphyElement<"button"> = {
    button: [{ span: asContent(label), style: { position: "relative", zIndex: 1 } }],
    type: "button",
    disabled: props.disabled,
    style: {
      position: "relative",
      appearance: "none",
      border: "none",
      cursor: props.disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      fontSize: (listener: Listener) => themeSize(listener, sizing.fontSizeTone),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * sizing.paddingBlockUnits),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * sizing.paddingInlineUnits),
      ...(sizing.square ? { aspectRatio: "1" } : {}),
      // A radius far beyond any realistic box half-height forces a full pill/circle —
      // the browser clamps it to the shape's own geometry (not tracked by the
      // raw-spacing-value doctor rule, which only checks margin/padding/gap props).
      borderRadius: "999px",
      opacity: props.disabled ? 0.6 : 1,
      transition: "transform 150ms ease, filter 150ms ease",
      "&:hover:not([disabled])": { filter: "brightness(1.06)" },
      "&:active:not([disabled])": { transform: "scale(0.97)" },
      ...fillStyle,
      ...(props.style ?? {}),
    } as StyleObject,
  };
  if (props.onClick) buttonElement.onClick = props.onClick;

  return {
    div: [glowLayer, buttonElement],
    style: { position: "relative", display: "inline-block" },
  };
}

export { rainbowButton };
