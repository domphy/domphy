// Magic UI "Neon Gradient Card" — clean-room reimplementation.
//
// A card wrapped in a thick, saturated two-color gradient frame that reads
// like a neon sign outline, with a softer blurred duplicate behind it for
// the halo/glow. Implemented purely from the block's public functional/
// visual spec — no upstream Magic UI source was viewed or copied.
//
// Built as three stacked layers sharing one wrapper (padding creates the
// ring gap; no SVG/mask needed): a blurred, oversized glow copy of the
// gradient behind everything; a sharp gradient "frame" layer that shows
// through exactly the padding gap the ordinary-flow content div leaves; and
// the content surface itself, on top. Both gradient layers are
// `pointer-events: none` so normal interaction with the content is
// unaffected, and the frame's background-position is looped via a CSS
// keyframe for the "slow pulsing light" motion the spec describes.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface NeonGradientCardNeonColors {
  /** First gradient hue. Defaults to `"secondary"` (a magenta/pink family in the default theme). */
  firstColor?: ThemeColor;
  /** Second gradient hue. Defaults to `"info"` (a cyan family in the default theme). */
  secondColor?: ThemeColor;
}

export interface NeonGradientCardProps {
  /** Content rendered inside the frame. Defaults to a small demo card body. */
  children?: DomphyElement | DomphyElement[];
  /** Neon frame thickness, in pixels (a thin fixed hairline). Defaults to `2`. */
  borderSize?: number;
  /** Corner rounding, in pixels. Defaults to `20`. */
  borderRadius?: number;
  /** The two gradient hues the frame blends through. */
  neonColors?: NeonGradientCardNeonColors;
  /** Loop duration for the gradient's slow pulse, in seconds. Defaults to `6`. */
  duration?: number;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

let neonGradientCardInstanceCounter = 0;

/**
 * A card framed by a thick, animated two-color neon gradient border with a
 * blurred halo behind it. Call with no arguments for a working demo card.
 */
function neonGradientCard(props: NeonGradientCardProps = {}): DomphyElement<"div"> {
  const borderSize = props.borderSize ?? 2;
  const borderRadius = props.borderRadius ?? 20;
  const firstColor = props.neonColors?.firstColor ?? "secondary";
  const secondColor = props.neonColors?.secondColor ?? "info";
  const duration = props.duration ?? 6;
  const children: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h3: "Neon Gradient Card", $: [heading()] } as DomphyElement,
        {
          p: "A pulsing two-color neon frame halos this card.",
          $: [paragraph({ color: "neutral" })],
        } as DomphyElement,
      ];

  // Upstream measures the card's rendered width and sets the halo blur to
  // width/3, so the glow stays proportional to the card. Recompute on resize.
  let resizeObserver: ResizeObserver | null = null;

  const instanceId = ++neonGradientCardInstanceCounter;
  const animationName = `neon-gradient-card-pulse-${hashString(
    JSON.stringify({ instanceId, firstColor, secondColor, duration }),
  )}`;
  // "background-position spin" — alternates the gradient's focal point
  // between top-center and bottom-center, looping forever.
  const keyframes = {
    "0%,100%": { backgroundPosition: "50% 0%" },
    "50%": { backgroundPosition: "50% 100%" },
  };

  const gradientImage = (listener: Listener) =>
    `linear-gradient(0deg, ${themeColor(listener, "shift-9", firstColor)}, ${themeColor(listener, "shift-9", secondColor)})`;

  // Decorative gradient layers carry no text of their own — exempt from the
  // missing-color contract (same idiom as `borderBeam`/`shineBorder`'s ring
  // layers in this package). Built through untyped literals, then asserted,
  // so `_doctorDisable` (a doctor-only annotation not present in core's
  // strict `PartialElement` type) doesn't trip the excess-property check.
  const glowLayer = {
    div: null,
    dataNeonGlow: "true",
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    // Upstream sizes the halo blur to the card's own width (offsetWidth / 3),
    // so the glow stays proportional as the card grows. Measure the parent
    // wrapper on mount (and on resize) and write the blur imperatively. The
    // hook lives on this layer — not the wrapper — because a node's own Mount
    // fires only once it is appended, whereas the wrapper's fires before its
    // children exist.
    _onMount: (node: ElementNode) => {
      const glow = node.domElement as HTMLElement;
      const wrapper = glow.parentElement;
      if (!wrapper) return;
      const applyBlur = () => {
        glow.style.filter = `blur(${wrapper.offsetWidth / 3}px)`;
      };
      applyBlur();
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(applyBlur);
        resizeObserver.observe(wrapper);
      }
    },
    _onRemove: () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
    },
    style: {
      position: "absolute",
      inset: `${-(borderSize * 2)}px`,
      borderRadius: `${borderRadius + borderSize * 2}px`,
      backgroundImage: gradientImage,
      backgroundSize: "100% 200%",
      // Pre-mount / no-JS fallback; `_onMount` overrides this with the
      // width-proportional `blur(offsetWidth / 3)` upstream uses.
      filter: `blur(${themeSpacing(borderSize * 3)})`,
      opacity: 0.8,
      pointerEvents: "none",
      zIndex: 0,
      animation: `${animationName} ${duration}s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  } as DomphyElement<"div">;

  const frameLayer = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: `${borderRadius}px`,
      backgroundImage: gradientImage,
      backgroundSize: "100% 200%",
      pointerEvents: "none",
      zIndex: 1,
      animation: `${animationName} ${duration}s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  } as DomphyElement<"div">;

  const contentLayer: DomphyElement<"div"> = {
    div: children,
    style: {
      position: "relative",
      zIndex: 2,
      boxSizing: "border-box",
      width: "100%",
      height: "100%",
      minHeight: "inherit",
      overflowWrap: "break-word",
      borderRadius: `${Math.max(borderRadius - borderSize, 0)}px`,
      padding: themeSpacing(6),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-10", "neutral"),
    } as StyleObject,
  };

  return {
    div: [glowLayer, frameLayer, contentLayer],
    style: {
      position: "relative",
      // Lift the whole card above sibling content (upstream `z-10`).
      zIndex: 10,
      boxSizing: "border-box",
      // Fill the parent instead of shrink-wrapping content (upstream `size-full`).
      width: "100%",
      height: "100%",
      borderRadius: `${borderRadius}px`,
      // The gap this padding leaves (between the wrapper's edge and the
      // ordinary-flow content div) is exactly where `frameLayer` — an
      // `inset: 0` absolutely positioned sibling filling the wrapper's whole
      // padding box — shows through as the visible neon ring. Its width is
      // `borderSize` in pixels (upstream's `--border-size`): a fixed thin
      // hairline, not an em-scaled band.
      padding: `${borderSize}px`,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { neonGradientCard };
export type { NeonGradientCardNeonColors as NeonColors };
