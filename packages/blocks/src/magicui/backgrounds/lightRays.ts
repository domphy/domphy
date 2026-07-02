// magicui "Light Rays" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). An
// ambient full-container effect of several soft, blurred light beams
// streaming down from the top and gently swaying and pulsing forever.
//
// Continuous per-ray animation is pure CSS `@keyframes` (the same
// block-port convention already used by `meteors()`/`dottedMap()` in this
// package): two coupled keyframe animations (an opacity pulse and a
// rotation sway) sharing the same randomized duration/delay play on the
// same element via the CSS `animation` shorthand's comma-separated
// multi-value syntax, so they stay in lockstep without any JS animation
// loop. Each ray's horizontal position, base tilt, width, swing amplitude,
// delay, and duration are randomized once at generation time so the set
// never looks synchronized.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface LightRaysProps {
  /** Number of rays. Defaults to `7`. */
  count?: number;
  /** Theme color family for the ray tint. Defaults to `"primary"` (reads as a soft
   * translucent blue against a dark backdrop). */
  color?: ThemeColor;
  /** Blur radius, in px. Defaults to `36`. */
  blur?: number;
  /** Peak ray opacity, 0–1. Defaults to `0.65`. */
  opacity?: number;
  /** Seconds per animation cycle. Defaults to `14`. */
  speed?: number;
  /** Ray height, any CSS length. Defaults to `"70vh"`. */
  length?: string;
  /** Foreground content layered above the rays. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let lightRaysInstanceCounter = 0;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function glowBlob(key: string, corner: "left" | "right", color: ThemeColor): DomphyElement {
  return {
    div: null,
    _key: key,
    ariaHidden: "true",
    // Decorative ambient glow with no text of its own — exempt from the
    // missing-color contract (mirrors meteors()/dottedMap() in this package).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      top: 0,
      left: corner === "left" ? 0 : "auto",
      right: corner === "right" ? 0 : "auto",
      width: "45%",
      height: "45%",
      pointerEvents: "none",
      mixBlendMode: "screen",
      backgroundImage: (listener) =>
        `radial-gradient(circle, ${themeColor(listener, "shift-10", color)} 0%, transparent 70%)`,
      filter: "blur(48px)",
    } as StyleObject,
  } as DomphyElement;
}

/**
 * Ambient field of soft, blurred light beams streaming down from the top of
 * the container, each independently swaying and pulsing forever. Purely
 * ambient — pointer events disabled, no user interaction. Call with no
 * arguments for a working demo — seven staggered rays over a dark panel
 * behind a heading.
 */
function lightRays(props: LightRaysProps = {}): DomphyElement<"div"> {
  const instanceId = ++lightRaysInstanceCounter;
  const count = Math.max(1, Math.round(props.count ?? 7));
  const color = props.color ?? "primary";
  const blur = props.blur ?? 36;
  const peakOpacity = props.opacity ?? 0.65;
  const speed = props.speed ?? 14;
  const length = props.length ?? "70vh";

  const rayElements: DomphyElement[] = Array.from({ length: count }, (_unused, index) => {
    const leftPercent = ((index + 0.5) / count) * 100 + randomBetween(-1, 1) * (50 / count);
    const baseAngle =
      count > 1 ? -28 + (index / (count - 1)) * 56 + randomBetween(-5, 5) : randomBetween(-8, 8);
    const widthPercent = randomBetween(4, 10);
    const swingAmplitude = randomBetween(6, 16);
    const delaySeconds = randomBetween(0, speed);
    const durationSeconds = speed * randomBetween(0.85, 1.15);

    const opacityKeyframes = {
      "0%": { opacity: 0 },
      "50%": { opacity: peakOpacity },
      "100%": { opacity: 0 },
    };
    const rotateKeyframes = {
      "0%": { transform: `rotate(${(baseAngle - swingAmplitude).toFixed(2)}deg)` },
      "50%": { transform: `rotate(${(baseAngle + swingAmplitude).toFixed(2)}deg)` },
      "100%": { transform: `rotate(${(baseAngle - swingAmplitude).toFixed(2)}deg)` },
    };
    const opacityAnimationName = `light-ray-opacity-${hashString(`${instanceId}-${index}-${JSON.stringify(opacityKeyframes)}`)}`;
    const rotateAnimationName = `light-ray-rotate-${hashString(`${instanceId}-${index}-${JSON.stringify(rotateKeyframes)}`)}`;

    return {
      div: null,
      _key: `ray-${instanceId}-${index}`,
      ariaHidden: "true",
      // Decorative light beam with no text of its own — exempt from the
      // missing-color contract.
      _doctorDisable: "missing-color",
      style: {
        position: "absolute",
        top: 0,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        height: length,
        transformOrigin: "top center",
        clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
        pointerEvents: "none",
        mixBlendMode: "screen",
        filter: `blur(${blur}px)`,
        backgroundImage: (listener) =>
          `linear-gradient(to bottom, ${themeColor(listener, "shift-11", color)} 0%, transparent 100%)`,
        animation: `${opacityAnimationName} ${durationSeconds.toFixed(2)}s ease-in-out ${delaySeconds.toFixed(2)}s infinite, ${rotateAnimationName} ${durationSeconds.toFixed(2)}s ease-in-out ${delaySeconds.toFixed(2)}s infinite`,
        [`@keyframes ${opacityAnimationName}`]: opacityKeyframes,
        [`@keyframes ${rotateAnimationName}`]: rotateKeyframes,
      } as StyleObject,
    } as DomphyElement;
  });

  const defaultChildren: DomphyElement[] = [
    { h2: "Light Rays", $: [heading()] } as DomphyElement,
    {
      p: "Soft, blurred beams sway and pulse behind your content.",
      $: [paragraph()],
    } as DomphyElement,
  ];
  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultChildren;

  return {
    div: [
      glowBlob(`glow-left-${instanceId}`, "left", color),
      glowBlob(`glow-right-${instanceId}`, "right", color),
      ...rayElements,
      { div: contentChildren, style: { position: "relative", zIndex: 1 } },
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { lightRays };
