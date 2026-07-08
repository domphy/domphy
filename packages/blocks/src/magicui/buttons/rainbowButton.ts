// Magic UI "Rainbow Button" — verified directly against the real upstream
// source (registry/magicui/rainbow-button.tsx, MIT-licensed).
//
// Real upstream technique (NOT a full rainbow-filled face — an earlier
// version of this port got that wrong): a solid, theme-flipping flat face
// (near-black in light mode, near-white in dark mode for `default`; the
// literal inverse for `outline`) painted via THREE stacked backgrounds —
// (1) the flat color clipped to the padding-box (interior only), (2) the
// SAME flat color, faded top-to-transparent, clipped to the border-box
// (covers the border ring), (3) the panning rainbow gradient clipped to the
// border-box, sitting behind both. Because layer (1) only covers the
// interior, the border ring shows layer (2) fading into layer (3) — so the
// rainbow reads as a thin, fading strip at the BOTTOM of the border only,
// not a full ring and never across the whole face. A small blurred rainbow
// bar centered just under the button (not a symmetric halo around it) adds
// the ambient glow. `outline` uses the identical technique with the flat
// face inverted and its own bottom border suppressed so the same fade
// shows through unobstructed.
//
// The gradient is painted at 200% background-size and a linear-infinite
// keyframe animates `backgroundPosition` from "0% 50%" to "200% 50%" —
// since the animation's end offset matches the oversized background-size,
// the pattern tiles seamlessly with no visible seam (the same relationship
// `animatedGradientText.ts` already uses at 300%/300%).
//
// The upstream spec's rainbow is five literal hues (red/violet/blue/cyan/
// yellow-green), painted in the spec's own color-1/color-5/color-3/color-4/
// color-2 stop order (red → yellow-green → blue → cyan → violet, not a plain
// spectrum sweep). Domphy's doctor rules forbid raw hex/rgb color literals on
// style props, and this theme has no dedicated violet family, so the
// gradient stops are five `ThemeColor` roles instead, in that same order:
// "error" (red) → "success" (yellow-green) → "primary" (blue) → "info" (cyan)
// → "secondary" (this theme's rose/magenta — the closest built-in role to
// violet, same substitution `animatedGradientText` documents).
// This keeps the sweep fully theme-aware (it follows light/dark theme swaps)
// at the cost of not accepting an arbitrary caller-supplied hex list. The
// flat face's own fade-stop opacity (upstream's `rgba(...,.6)` mid-stop) is
// expressed via `color-mix()` against `transparent` (the same idiom this
// package's `demoContentScrim.ts` shared helper already uses), since
// `themeColor()` itself only ever returns a solid `var(--x-n)` reference.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export type RainbowButtonVariant = "default" | "outline";
export type RainbowButtonSize = "sm" | "default" | "lg" | "icon";

export interface RainbowButtonProps {
  /** Button label content. Defaults to `"Get unlimited access"`. */
  children?: DomphyElement | DomphyElement[] | string;
  /** `"default"` is a solid dark (light-theme) / light (dark-theme) face with the
   * animated rainbow showing only as a thin fading strip along the bottom border;
   * `"outline"` is the literal inverse face with a visible border on 3 sides and the
   * same bottom-only rainbow strip. Neither variant fills the whole face with the
   * gradient. Defaults to `"default"`. */
  variant?: RainbowButtonVariant;
  /** Standard button size preset. Defaults to `"default"`. */
  size?: RainbowButtonSize;
  /** Gradient stops the sweep pans through, in order. Defaults to a five-hue rainbow
   * approximation: `["error", "success", "primary", "info", "secondary"]`, matching
   * upstream's own color-1/color-5/color-3/color-4/color-2 stop order. */
  colors?: ThemeColor[];
  /** One full pan cycle, in seconds. Defaults to `2`, matching upstream's `--speed` default. */
  duration?: number;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  style?: StyleObject;
}

const DEFAULT_RAINBOW_COLORS: ThemeColor[] = ["error", "success", "primary", "info", "secondary"];

interface RainbowButtonSizing {
  paddingBlockUnits: number;
  paddingInlineUnits: number;
  fontSizeTone: "decrease-1" | "inherit" | "increase-1";
  radiusUnits: number;
  square?: boolean;
}

// Upstream: only `sm` shrinks the label to `text-xs`; `lg` keeps the base
// `text-sm` (so `fontSizeTone` stays `inherit`, NOT enlarged). Radius: `sm`/`lg`
// use the extra-rounded `rounded-xl`, while `default`/`icon` inherit the base
// `rounded-sm` — hence the doubled `radiusUnits` on `sm`/`lg`.
const RAINBOW_BUTTON_SIZES: Record<RainbowButtonSize, RainbowButtonSizing> = {
  sm: { paddingBlockUnits: 0.75, paddingInlineUnits: 2.5, fontSizeTone: "decrease-1", radiusUnits: 2 },
  default: { paddingBlockUnits: 1, paddingInlineUnits: 3, fontSizeTone: "inherit", radiusUnits: 1 },
  lg: { paddingBlockUnits: 1.5, paddingInlineUnits: 5, fontSizeTone: "inherit", radiusUnits: 2 },
  icon: { paddingBlockUnits: 1, paddingInlineUnits: 1, fontSizeTone: "inherit", square: true, radiusUnits: 1 },
};

let rainbowButtonInstanceCounter = 0;

/** Normalizes a `DomphyElement | DomphyElement[] | string` prop into the flat
 * `(string | DomphyElement)[]` shape `DomphyElement<T>`'s content field expects — a
 * bare single element isn't part of that type, only primitives/arrays/functions are. */
function asContent(value: DomphyElement | DomphyElement[] | string): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * A small-radius hero/CTA button filled (or, in `"outline"` mode, ringed) with a
 * continuously panning multi-hue gradient, backed by a soft blurred duplicate of the
 * same gradient acting as a colorful ambient glow. The pan animation is fully ambient —
 * it loops from mount with no interaction required. Matching upstream, the button has NO
 * hover or press visual change (only an inert `transition-all` and a focus-visible ring).
 * Call with no arguments for a working demo button.
 */
function rainbowButton(props: RainbowButtonProps = {}): DomphyElement<"div"> {
  const label = props.children ?? "Get unlimited access";
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";
  const colors = props.colors && props.colors.length > 0 ? props.colors : DEFAULT_RAINBOW_COLORS;
  const duration = props.duration ?? 2;
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

  // Matches upstream's own two variants exactly: `default` is this package's
  // established "solid dark button" token (shift-17 — the same one shadcn
  // auth forms' submit buttons use), `outline` is its literal inverse
  // (shift-0) — neither is tied to the rainbow itself.
  const faceTone = isOutline ? "shift-0" : "shift-17";
  const textTone = isOutline ? "shift-17" : "shift-0";
  // Upstream's layer-2 mid-fade (the `80%` stop) is a `.6`-opacity color, but
  // WHICH color differs by variant: `default` fades over the SAME flat face
  // color (`#121213`→`rgba(18,18,19,.6)`; dark `#fff`→`rgba(255,255,255,.6)`),
  // while `outline` fades over the INVERSE face — the text tone (light: white
  // face over `rgba(18,18,19,.6)`; dark: `#0a0a0a` face over
  // `rgba(255,255,255,.6)`). So the mid-fade tone is `textTone` for outline,
  // `faceTone` otherwise. `themeColor()` only returns a solid `var(--x-n)`, so
  // the `.6` alpha is layered on via `color-mix()` against `transparent`, the
  // same idiom `demoContentScrim.ts` already uses.
  const midFadeTone = isOutline ? textTone : faceTone;
  const fadedFace = (listener: Listener) =>
    `color-mix(in srgb, ${themeColor(listener, midFadeTone, "neutral")} 60%, transparent)`;

  const fillStyle = {
    // Real upstream technique: THREE stacked backgrounds, not a single
    // full-face gradient — (1) the flat face clipped to the padding-box
    // (interior only), (2) the SAME flat color faded top-opaque to
    // bottom-transparent, clipped to the border-box, (3) the panning rainbow,
    // also clipped to the border-box, behind both. Layer (1) hides the
    // interior completely; layer (2) only lets layer (3) peek through where
    // it has faded away — a thin, fading rainbow strip at the BOTTOM of the
    // border only, never a full ring and never across the whole face.
    backgroundImage: (listener: Listener) =>
      [
        `linear-gradient(${themeColor(listener, faceTone, "neutral")}, ${themeColor(listener, faceTone, "neutral")})`,
        `linear-gradient(${themeColor(listener, faceTone, "neutral")} 50%, ${fadedFace(listener)} 80%, transparent)`,
        `linear-gradient(90deg, ${gradientStops(listener)})`,
      ].join(", "),
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box, border-box",
    backgroundSize: "auto, auto, 200% 100%",
    backgroundRepeat: "no-repeat, no-repeat, repeat",
    // `outline` keeps a real 1px border stroke on 3 sides (upstream's
    // `border border-input` = 1px) but suppresses the BOTTOM one specifically,
    // so nothing covers the fading rainbow strip there; `default` uses a fully
    // transparent 2px border on all sides (upstream's own `[border:calc(0.125rem)]`
    // spacer — only ever a spacer for the background layers to paint into,
    // never a visible stroke).
    ...(isOutline
      ? {
          borderBlockStart: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
          borderInlineStart: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
          borderInlineEnd: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
          borderBlockEnd: "1px solid transparent",
        }
      : { border: "2px solid transparent" }),
    color: (listener: Listener) => themeColor(listener, textTone, "neutral"),
    animation: flowAnimation,
    [`@keyframes ${animationName}`]: flowKeyframes,
  };

  // Small blurred rainbow bar centered just under the button — NOT a
  // symmetric halo around the whole shape (upstream's `before:` pseudo is a
  // 60%-wide, 20%-tall bar sitting 20% below the button's own bottom edge,
  // blurred 0.75rem/12px). `_doctorDisable` isn't part of core's strict
  // `PartialElement` type — build through an untyped literal, then assert,
  // so the excess-property check doesn't fire (mirrors `overlayCanvas` in
  // confetti.ts).
  const glowLayer = {
    span: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockEnd: "-20%",
      insetInlineStart: "50%",
      transform: "translateX(-50%)",
      width: "60%",
      height: "20%",
      backgroundImage: (listener: Listener) => `linear-gradient(90deg, ${gradientStops(listener)})`,
      backgroundSize: "200% 100%",
      filter: "blur(12px)",
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
      // Upstream `whitespace-nowrap shrink-0`: a long label must never wrap, and
      // the button must not be squeezed by a flex parent.
      whiteSpace: "nowrap",
      flexShrink: 0,
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      // Upstream `font-medium` (weight 500), not the default 400.
      fontWeight: 500,
      fontSize: (listener: Listener) => themeSize(listener, sizing.fontSizeTone),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * sizing.paddingBlockUnits),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * sizing.paddingInlineUnits),
      ...(sizing.square ? { aspectRatio: "1" } : {}),
      // Per-size radius: base `rounded-sm` for default/icon, extra-rounded
      // `rounded-xl` for sm/lg — driven by `sizing.radiusUnits`.
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * sizing.radiusUnits),
      // Upstream `disabled:opacity-50`.
      opacity: props.disabled ? 0.5 : 1,
      // Upstream is inert `transition-all group` with NO hover/press visual
      // change, plus `outline-none focus-visible:ring-[3px]`. Mirror exactly: an
      // inert transition (nothing animates on state), no native outline, and a
      // 3px keyboard-focus ring — no brightness/scale feedback.
      transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
      outline: "none",
      "&:focus-visible": {
        boxShadow: (listener: Listener) => `0 0 0 3px ${themeColor(listener, "shift-6", "neutral")}`,
      },
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
