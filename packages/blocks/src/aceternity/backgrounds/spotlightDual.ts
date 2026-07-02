// Aceternity UI "Spotlight New" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Two soft blue-toned radial spotlight glows anchored at the left and right
// edges of a dark hero section, each built from stacked blurred gradient
// layers for a smooth falloff, gently swaying for ambient depth.
//
// Two-stage animation, neither of which needs a JS loop: the `motion()`
// patch (Web Animations API) plays a one-shot fade-in (`opacity: 0 -> 1`) on
// mount, layered independently on top of a plain infinite CSS `@keyframes`
// that alternates each group's `transform: translateX(...)` back and forth —
// the two never conflict because `motion()` here only ever touches `opacity`
// (see its own source), leaving `transform` entirely to the CSS animation.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, motion, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface SpotlightDualProps {
  /** Theme color role for the spotlight glow. Defaults to `"info"` (reads as a
   * soft blue, matching the reference's hue ~210). */
  color?: ThemeColor;
  /** Main beam shape width, in `themeSpacing` units. Defaults to `70`. */
  width?: number;
  /** Main beam shape height, in `themeSpacing` units. Defaults to `170`. */
  height?: number;
  /** Secondary (narrower) beam layer width, in `themeSpacing` units. Defaults to `36`. */
  smallWidth?: number;
  /** Vertical offset applied to both beam groups, in `themeSpacing` units. Defaults to `-40`. */
  translateY?: number;
  /** Horizontal sway distance per cycle, in `themeSpacing` units. Defaults to `10`. */
  xOffset?: number;
  /** Seconds per sway cycle. Defaults to `7`. */
  duration?: number;
  /** Mount fade-in duration, in ms. Defaults to `1500`. */
  fadeInDuration?: number;
  /** Foreground content layered above the spotlights. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

/** One layer's falloff tuning: tone step (brightness), size multiplier, and blur. */
interface SpotlightLayerSpec {
  tone: "shift-12" | "shift-9" | "shift-6";
  sizeMultiplier: number;
  blurPx: number;
  opacity: number;
}

const LAYER_SPECS: SpotlightLayerSpec[] = [
  { tone: "shift-12", sizeMultiplier: 1, blurPx: 40, opacity: 0.9 }, // bright core
  { tone: "shift-9", sizeMultiplier: 1.5, blurPx: 70, opacity: 0.6 }, // medium halo
  { tone: "shift-6", sizeMultiplier: 2.1, blurPx: 110, opacity: 0.35 }, // faint outer glow
];

let spotlightDualInstanceCounter = 0;

/** One elongated, blurred radial-gradient ellipse — one falloff layer within a spotlight group. */
function spotlightLayer(
  key: string,
  spec: SpotlightLayerSpec,
  color: ThemeColor,
  width: number,
  height: number,
): DomphyElement {
  return {
    div: null,
    _key: key,
    ariaHidden: "true",
    // Decorative blurred glow with no text of its own — exempt from the
    // missing-color contract (mirrors lightRays.ts's glow blobs).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: themeSpacing(Math.round(width * spec.sizeMultiplier)),
      height: themeSpacing(Math.round(height * spec.sizeMultiplier)),
      borderRadius: "50%",
      opacity: spec.opacity,
      filter: `blur(${spec.blurPx}px)`,
      backgroundImage: (listener) => `radial-gradient(ellipse at center, ${themeColor(listener, spec.tone, color)} 0%, transparent 70%)`,
    } as StyleObject,
  } as DomphyElement;
}

/** One mirrored side's stack of falloff layers, swaying back and forth forever after its mount fade-in. */
function spotlightGroup(
  side: "left" | "right",
  instanceId: number,
  color: ThemeColor,
  width: number,
  height: number,
  smallWidth: number,
  translateY: number,
  xOffset: number,
  duration: number,
  fadeInDuration: number,
): DomphyElement {
  const angle = side === "left" ? -45 : 45;
  const swayDirection = side === "left" ? 1 : -1;
  const swayKeyframes = {
    "0%": { transform: `translateX(0) rotate(${angle}deg)` },
    "50%": { transform: `translateX(${swayDirection * xOffset}px) rotate(${angle}deg)` },
    "100%": { transform: `translateX(0) rotate(${angle}deg)` },
  };
  const swayAnimationName = `spotlight-dual-sway-${side}-${hashString(JSON.stringify({ instanceId, swayKeyframes }))}`;

  return {
    div: [
      spotlightLayer("core", LAYER_SPECS[0], color, width, height),
      spotlightLayer("halo", LAYER_SPECS[1], color, width, height),
      spotlightLayer("outer", LAYER_SPECS[2], color, smallWidth, height),
    ],
    _key: `spotlight-${side}`,
    ariaHidden: "true",
    $: [motion({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: fadeInDuration, easing: "ease-out" } })],
    style: {
      position: "absolute",
      top: themeSpacing(translateY),
      left: side === "left" ? themeSpacing(-10) : "auto",
      right: side === "right" ? themeSpacing(-10) : "auto",
      transformOrigin: side === "left" ? "top left" : "top right",
      animation: `${swayAnimationName} ${duration}s ease-in-out infinite`,
      [`@keyframes ${swayAnimationName}`]: swayKeyframes,
      "@media (prefers-reduced-motion: reduce)": { animationPlayState: "paused" },
    } as StyleObject,
  } as DomphyElement;
}

/**
 * Two mirrored, softly blurred spotlight glows anchored at the left and
 * right edges of a dark hero section — fade in on mount, then sway gently
 * forever. Purely ambient; no pointer interaction. Call with no arguments
 * for a working demo — two blue spotlights behind a heading.
 */
function spotlightDual(props: SpotlightDualProps = {}): DomphyElement<"div"> {
  const instanceId = ++spotlightDualInstanceCounter;
  const color = props.color ?? "info";
  const width = props.width ?? 70;
  const height = props.height ?? 170;
  const smallWidth = props.smallWidth ?? 36;
  const translateY = props.translateY ?? -40;
  const xOffset = props.xOffset ?? 10;
  const duration = props.duration ?? 7;
  const fadeInDuration = props.fadeInDuration ?? 1500;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultSpotlightContent();

  return {
    div: [
      spotlightGroup("left", instanceId, color, width, height, smallWidth, translateY, xOffset, duration, fadeInDuration),
      spotlightGroup("right", instanceId, color, width, height, smallWidth, translateY, xOffset, duration, fadeInDuration),
      { div: contentChildren, style: { position: "relative", zIndex: 1 } } as DomphyElement,
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(80),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

function defaultSpotlightContent(): DomphyElement[] {
  return [
    { h2: "Spotlight", $: [heading()] } as DomphyElement,
    {
      p: "Two soft blue glows fade in and sway gently behind this content.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

export { spotlightDual };
