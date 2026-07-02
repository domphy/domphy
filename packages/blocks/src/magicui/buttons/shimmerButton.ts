// Magic UI "Shimmer Button" — clean-room reimplementation.
//
// A dark, near-pill button whose thin bright edge-highlight continuously
// rotates around its outline, like a spotlight tracing the border. Implemented
// purely from the block's public functional/visual spec — no upstream Magic
// UI source was viewed or copied.
//
// Technique: an oversized square patch filled with a `conic-gradient` (mostly
// transparent, one bright wedge) sits BEHIND everything and is continuously
// rotated via a plain CSS `transform: rotate()` keyframe loop. A second,
// solid layer the same color as the button sits on top of it, inset by
// `shimmerSize` on every side — so only a `shimmerSize`-thick ring of the
// rotating wedge peeks out around the solid layer's edge, which reads as a
// highlight traveling around the border. `overflow: hidden` on the button
// itself is essential: without it the oversized rotating patch would spill
// outside the rounded silhouette instead of only ever showing as a thin ring.
// A third, separate radial-gradient layer (opacity toggled on `:hover` via a
// `data-slot` attribute selector — the same descendant-hover technique the
// sidebar blocks already use for their own row actions) supplies the hover glow.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export interface ShimmerButtonProps {
  /** Button label content. Defaults to `"Shimmer Button"`. */
  children?: DomphyElement | DomphyElement[] | string;
  /** Fill color family for the button's dark base and the ring's solid mask layer.
   * Defaults to `"neutral"` (near-black, via a `shift-15` dark edge anchor). */
  background?: ThemeColor;
  /** Color family the rotating highlight sliver and hover glow are drawn from.
   * Defaults to `"neutral"` (near-white). */
  shimmerColor?: ThemeColor;
  /** Thickness of the visible ring, as a CSS length. Defaults to `"0.12em"`. */
  shimmerSize?: string;
  /** One full rotation around the border, in seconds. Defaults to `3`. */
  shimmerDuration?: number;
  /** Corner radius in pixels. Defaults to `100` (near-pill). */
  borderRadius?: number;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  style?: StyleObject;
}

let shimmerButtonInstanceCounter = 0;

/** Normalizes a `DomphyElement | DomphyElement[] | string` prop into the flat
 * `(string | DomphyElement)[]` shape `DomphyElement<T>`'s content field expects — a
 * bare single element isn't part of that type, only primitives/arrays/functions are. */
function asContent(value: DomphyElement | DomphyElement[] | string): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * A dark, near-pill button with a thin bright highlight continuously rotating
 * around its border, plus a soft inner radial glow on hover — a premium/
 * "shimmering" call-to-action. The border rotation is fully ambient and loops
 * from mount; hover/press layer ordinary scale/brightness feedback on top.
 * Call with no arguments for a working demo button.
 */
function shimmerButton(props: ShimmerButtonProps = {}): DomphyElement<"button"> {
  const label = props.children ?? "Shimmer Button";
  const background = props.background ?? "neutral";
  const shimmerColor = props.shimmerColor ?? "neutral";
  const shimmerSize = props.shimmerSize ?? "0.12em";
  const shimmerDuration = props.shimmerDuration ?? 3;
  const borderRadius = props.borderRadius ?? 100;

  const instanceId = ++shimmerButtonInstanceCounter;
  const spinAnimationName = `shimmer-button-spin-${hashString(
    JSON.stringify({ instanceId, shimmerColor, shimmerDuration }),
  )}`;
  const spinKeyframes = {
    from: { transform: "translate(-50%, -50%) rotate(0deg)" },
    to: { transform: "translate(-50%, -50%) rotate(360deg)" },
  };

  // Rotating highlight patch: a mostly-transparent conic gradient with one bright
  // wedge near the seam, sized well beyond the button's own box (200%) so every
  // corner stays covered through a full rotation about its own center.
  //
  // `_doctorDisable` isn't part of core's strict `PartialElement` type — build each
  // decorative layer through an untyped literal, then assert, so the excess-property
  // check doesn't fire (mirrors `overlayCanvas` in confetti.ts).
  const rotatingSliver = {
    span: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: "200%",
      height: "200%",
      backgroundImage: (listener: Listener) =>
        `conic-gradient(from 0deg, transparent 0turn, transparent 0.82turn, ${themeColor(listener, "shift-1", shimmerColor)} 0.93turn, transparent 1turn)`,
      animation: `${spinAnimationName} ${shimmerDuration}s linear infinite`,
      [`@keyframes ${spinAnimationName}`]: spinKeyframes,
    } as StyleObject,
  } as DomphyElement<"span">;

  // Solid mask sitting on top of the rotating sliver, inset by `shimmerSize` on
  // every side — only that thin inset band of the layer beneath remains visible.
  const ringMask = {
    span: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: shimmerSize,
      borderRadius: "inherit",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", background),
    } as StyleObject,
  } as DomphyElement<"span">;

  // Hover-only soft radial glow, toggled purely via CSS on the button's own
  // `:hover` state (see `&:hover [data-slot=…]` below) — no JS/state needed.
  const hoverGlow = {
    span: null,
    ariaHidden: "true",
    dataSlot: "shimmer-hover-glow",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      opacity: 0,
      transition: "opacity 200ms ease",
      backgroundImage: (listener: Listener) =>
        `radial-gradient(circle at 50% 0%, ${themeColor(listener, "shift-3", shimmerColor)}, transparent 70%)`,
    } as StyleObject,
  } as DomphyElement<"span">;

  const labelSpan: DomphyElement<"span"> = {
    span: asContent(label),
    style: { position: "relative", zIndex: 1 },
  };

  const buttonElement: DomphyElement<"button"> = {
    button: [rotatingSliver, ringMask, hoverGlow, labelSpan],
    type: "button",
    disabled: props.disabled,
    // Sets a fixed dark surface regardless of the surrounding page tone (edge anchor,
    // per the doctor's dataTone-surface-contract idiom) rather than a raw literal
    // color — `backgroundColor`/`color` below both read this same context.
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      appearance: "none",
      border: "none",
      cursor: props.disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: `${borderRadius}px`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", background),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(2)} ${themeSpacing(6)} ${themeColor(listener, "shift-9")}`,
      opacity: props.disabled ? 0.6 : 1,
      transition: "transform 150ms ease, filter 150ms ease",
      "&:hover:not([disabled])": { transform: "scale(1.02)", filter: "brightness(1.1)" },
      "&:hover:not([disabled]) [data-slot=shimmer-hover-glow]": { opacity: 0.35 },
      "&:active:not([disabled])": { transform: "scale(0.96)" },
      ...(props.style ?? {}),
    } as StyleObject,
  };
  if (props.onClick) buttonElement.onClick = props.onClick;

  return buttonElement;
}

export { shimmerButton };
