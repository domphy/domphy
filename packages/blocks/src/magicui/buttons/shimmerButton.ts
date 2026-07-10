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
// The only other inner layer is upstream's `Highlight` — a transparent span
// whose bottom-edge inset box-shadow deepens on the button's `:hover`/`:active`
// (upstream's `group-hover`/`group-active`), toggled purely via CSS with a
// `data-slot` attribute selector (the same descendant-hover technique the
// sidebar blocks already use for their own row actions). Upstream has no radial
// hover-glow element, no outer drop shadow, and no hover scale/brightness.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

export interface ShimmerButtonProps {
  /** Button label content. Defaults to `"Shimmer Button"`. */
  children?: DomphyElement | DomphyElement[] | string;
  /** Fill color family for the button's dark base and the ring's solid mask layer.
   * Defaults to `"neutral"` (near-black, via a `shift-15` dark edge anchor). */
  background?: ThemeColor;
  /** Color family the rotating highlight sliver is drawn from.
   * Defaults to `"neutral"` (near-white). */
  shimmerColor?: ThemeColor;
  /** Thickness of the visible ring, as a CSS length. Defaults to `"0.05em"`. */
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
function asContent(
  value: DomphyElement | DomphyElement[] | string,
): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * A dark, near-pill button with a thin bright highlight continuously rotating
 * around its border, plus an always-on inset sheen along the bottom edge — a
 * premium/"shimmering" call-to-action. The border rotation is fully ambient and
 * loops from mount; on hover the bottom sheen deepens and on press the button
 * nudges 1px down (matching upstream — no hover scale/brightness). Call with no
 * arguments for a working demo button.
 */
function shimmerButton(
  props: ShimmerButtonProps = {},
): DomphyElement<"button"> {
  const label = props.children ?? "Shimmer Button";
  const background = props.background ?? "neutral";
  const shimmerColor = props.shimmerColor ?? "neutral";
  const shimmerSize = props.shimmerSize ?? "0.05em";
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
        `conic-gradient(from 0deg, transparent 0turn, ${themeColor(listener, "shift-1", shimmerColor)} 0.25turn, transparent 0.25turn)`,
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
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", background),
    } as StyleObject,
  } as DomphyElement<"span">;

  // Always-on glossy inset sheen along the bottom edge — upstream's own
  // `Highlight` layer: visible at rest (inset shadow at #ffffff1f ≈ 12% white)
  // and deepening to ~25% white on the button's hover and active states
  // (upstream's `group-hover`/`group-active`). This is the only inner layer
  // besides the rotating sliver and the ring mask.
  const innerHighlight = {
    span: null,
    ariaHidden: "true",
    dataSlot: "shimmer-highlight",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      // Upstream: `transition-all duration-300 ease-in-out` on the Highlight.
      transition: "box-shadow 300ms ease-in-out",
      boxShadow: (listener: Listener) =>
        `inset 0 -8px 10px color-mix(in srgb, ${themeColor(listener, "shift-0", "neutral")} 12%, transparent)`,
    } as StyleObject,
  } as DomphyElement<"span">;

  const labelSpan: DomphyElement<"span"> = {
    span: asContent(label),
    style: { position: "relative", zIndex: 1 },
  };

  const buttonElement: DomphyElement<"button"> = {
    button: [rotatingSliver, ringMask, innerHighlight, labelSpan],
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
      // Upstream: `border border-white/10` — a subtle 1px translucent-white
      // outline. `white/10` is white (shift-0 neutral) mixed 10% into
      // transparent, the same color-mix idiom `innerHighlight` uses for its
      // inset sheen.
      border: (listener: Listener) =>
        `1px solid color-mix(in srgb, ${themeColor(listener, "shift-0", "neutral")} 10%, transparent)`,
      cursor: props.disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      // Upstream: `whitespace-nowrap` — the label never wraps.
      whiteSpace: "nowrap",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      paddingBlock: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 3),
      borderRadius: `${borderRadius}px`,
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", background),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      opacity: props.disabled ? 0.6 : 1,
      // Upstream: `transform-gpu transition-transform duration-300 ease-in-out`.
      // No hover transform/filter — only the bottom Highlight sheen reacts.
      transition: "transform 300ms ease-in-out",
      "&:hover:not([disabled]) [data-slot=shimmer-highlight]": {
        boxShadow: (listener: Listener) =>
          `inset 0 -6px 10px color-mix(in srgb, ${themeColor(listener, "shift-0", "neutral")} 25%, transparent)`,
      },
      // Upstream: `active:translate-y-px` — a 1px downward nudge on press.
      "&:active:not([disabled])": { transform: "translateY(1px)" },
      "&:active:not([disabled]) [data-slot=shimmer-highlight]": {
        boxShadow: (listener: Listener) =>
          `inset 0 -10px 10px color-mix(in srgb, ${themeColor(listener, "shift-0", "neutral")} 25%, transparent)`,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };
  if (props.onClick) buttonElement.onClick = props.onClick;

  return buttonElement;
}

export { shimmerButton };
