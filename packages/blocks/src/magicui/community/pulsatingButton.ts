// Magic UI "Pulsating Button" — clean-room reimplementation.
//
// A normal solid button with a continuously pulsing glow ring behind it —
// either a symmetric "breathing" pulse or a one-directional "ripple"/radar
// ping — looping automatically the whole time it's mounted, independent of
// hover/click. Implemented purely from the block's public functional/visual
// spec — no upstream Magic UI source was viewed or copied.
//
// The glow lives on a second, absolutely-positioned, `pointer-events: none`
// decorative layer behind the label (so it never blocks clicks), sized to
// match the button's own rounded corners via `border-radius: inherit`. Its
// own `color` is bound through the exact same reactive `themeColor(l, tone,
// family)` call driving the real `button()` patch's background — so the
// glow "tracks the button's own live color" for free, with no runtime
// color-reading/observer needed. The `@keyframes` themselves only ever
// animate `box-shadow`'s numeric spread, using the CSS `currentColor`
// keyword (plus `color-mix()` for the fade) as the shadow color — `@keyframes`
// step values must be static strings (no reactive functions), so the color
// can't be baked into the keyframe directly; routing it through the
// element's own reactive `color` and referencing `currentColor` is what lets
// the loop stay theme-reactive without ever needing a non-static keyframe.

import type { DomphyElement, Listener, StyleObject, ValueOrState } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { button } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type PulsatingButtonVariant = "pulse" | "ripple";

export interface PulsatingButtonProps {
  /** Label content. Defaults to `"Pulsating Button"`. */
  children?: string | DomphyElement | DomphyElement[];
  /** Click handler. */
  onClick?: (event: MouseEvent) => void;
  /** Disables the button (the glow keeps looping regardless). */
  disabled?: boolean;
  /** Button color family. Also the glow's color family unless `pulseColor` is set. Defaults to `"primary"`. */
  color?: ValueOrState<ThemeColor>;
  /** Overrides the glow's own color family independent of the button's `color`. */
  pulseColor?: ThemeColor;
  /** One full pulse/ripple cycle, in ms. Defaults to `1500`. */
  duration?: number;
  /** How far outward the glow/ring expands, in `themeSpacing` units (≈8px at the default). Defaults to `2`. */
  expandDistance?: number;
  /** `"pulse"` (symmetric breathing glow) or `"ripple"` (one-directional expanding-and-fading ring). Defaults to `"pulse"`. */
  variant?: PulsatingButtonVariant;
  /** Passthrough style merged onto the button. */
  style?: StyleObject;
}

let pulsatingButtonInstanceCounter = 0;

/**
 * A solid, themed button with a continuously looping glow pulse (or ripple
 * ping) behind it, drawing attention without needing hover/click. Call with
 * no arguments for a working demo.
 */
function pulsatingButton(props: PulsatingButtonProps = {}): DomphyElement<"button"> {
  const label = props.children ?? "Pulsating Button";
  const disabled = props.disabled ?? false;
  const colorState = toState(props.color ?? "primary", "color");
  const duration = props.duration ?? 1500;
  const expandDistanceUnits = props.expandDistance ?? 2;
  const variant = props.variant ?? "pulse";

  const glowFamily = (listener: Listener): ThemeColor => props.pulseColor ?? colorState.get(listener);

  const instanceId = ++pulsatingButtonInstanceCounter;
  const expandLength = themeSpacing(expandDistanceUnits);
  const keyframes =
    variant === "ripple"
      ? {
          "0%": { boxShadow: "0 0 0 0 currentColor" },
          "100%": { boxShadow: `0 0 0 ${expandLength} color-mix(in srgb, currentColor 0%, transparent)` },
        }
      : {
          "0%,100%": { boxShadow: "0 0 0 0 color-mix(in srgb, currentColor 50%, transparent)" },
          "50%": { boxShadow: `0 0 0 ${expandLength} color-mix(in srgb, currentColor 50%, transparent)` },
        };
  const easing = variant === "ripple" ? "cubic-bezier(0.16, 1, 0.3, 1)" : "ease-out";
  const animationName = `pulsating-button-${variant}-${hashString(
    JSON.stringify({ instanceId, duration, expandDistanceUnits, variant }),
  )}`;

  const glowLayer: DomphyElement<"span"> = {
    span: null,
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      pointerEvents: "none",
      zIndex: 0,
      color: (listener: Listener) => themeColor(listener, "inherit", glowFamily(listener)),
      animation: `${animationName} ${duration}ms ${easing} infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  } as DomphyElement<"span">;

  const labelChildren: (string | DomphyElement)[] =
    typeof label === "string" ? [label] : Array.isArray(label) ? label : [label];

  const labelLayer: DomphyElement<"span"> = {
    span: labelChildren,
    style: { position: "relative", zIndex: 1 } as StyleObject,
  } as DomphyElement<"span">;

  const buttonElement: DomphyElement<"button"> = {
    button: [glowLayer, labelLayer],
    type: "button",
    disabled,
    $: [button({ color: colorState })],
    style: {
      position: "relative",
      overflow: "visible",
      ...(props.style ?? {}),
    } as StyleObject,
  };

  if (props.onClick) buttonElement.onClick = props.onClick;

  return buttonElement;
}

export { pulsatingButton };
