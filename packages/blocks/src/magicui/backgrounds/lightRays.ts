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
import { demoContentScrimStyle } from "../../shared/demoContentScrim.js";

export interface LightRaysProps {
  /** Number of rays. Defaults to `7`. */
  count?: number;
  /** Theme color family for the ray tint. Defaults to `"primary"` (reads as a soft
   * translucent blue against a dark backdrop). */
  color?: ThemeColor;
  /** Blur radius, in px. Defaults to `36`. */
  blur?: number;
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
  const gradientPosition = corner === "left" ? "20% 15%" : "80% 10%";
  const fadeStop = corner === "left" ? "70%" : "75%";
  return {
    div: null,
    _key: key,
    ariaHidden: "true",
    // Decorative ambient glow with no text of its own — exempt from the
    // missing-color contract (mirrors meteors()/dottedMap() in this package).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: 0.6,
      backgroundImage: (listener) =>
        `radial-gradient(circle at ${gradientPosition}, ${themeColor(listener, "shift-10", color)} 0%, transparent ${fadeStop})`,
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
  const speed = props.speed ?? 14;
  const length = props.length ?? "70vh";
  const cycleDuration = Math.max(speed, 0.1);

  const rayElements: DomphyElement[] = Array.from({ length: count }, (_unused, index) => {
    // Each ray fully random per upstream createRays() — a true scatter, not an
    // even index-fanned distribution.
    const leftPercent = randomBetween(8, 92);
    const baseAngle = randomBetween(-28, 28);
    const widthPixels = randomBetween(160, 320);
    const swingAmplitude = randomBetween(0.8, 2.6);
    const delaySeconds = randomBetween(0, cycleDuration);
    const durationSeconds = cycleDuration * randomBetween(0.75, 1.25);
    // Mirrors upstream's `repeatDelay: duration * 0.1` — each ray holds at
    // rest for one tenth of its cycle before pulsing again, rather than
    // looping straight back into the next rise.
    const totalCycleSeconds = durationSeconds * 1.1;
    const activePercent = (100 / 1.1).toFixed(2);
    const halfActivePercent = (50 / 1.1).toFixed(2);
    // Upstream: intensity = 0.6 + Math.random() * 0.5 (0.6–1.1, no prop).
    const rayPeakOpacity = randomBetween(0.6, 1.1);

    const opacityKeyframes = {
      "0%": { opacity: 0 },
      [`${halfActivePercent}%`]: { opacity: rayPeakOpacity },
      [`${activePercent}%`]: { opacity: 0 },
      "100%": { opacity: 0 },
    };
    const rotateKeyframes = {
      "0%": { transform: `rotate(${(baseAngle - swingAmplitude).toFixed(2)}deg)` },
      [`${halfActivePercent}%`]: { transform: `rotate(${(baseAngle + swingAmplitude).toFixed(2)}deg)` },
      [`${activePercent}%`]: { transform: `rotate(${(baseAngle - swingAmplitude).toFixed(2)}deg)` },
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
        // Upstream ray: `-top-[12%]` starts above the frame; `-translate-x-1/2`
        // centers the beam on its `left` coordinate (Tailwind v4 `translate`
        // property is independent of the animated `transform: rotate()`).
        top: "-12%",
        left: `${leftPercent}%`,
        width: `${widthPixels}px`,
        height: length,
        transformOrigin: "top center",
        translate: "-50%",
        clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
        pointerEvents: "none",
        mixBlendMode: "screen",
        filter: `blur(${blur}px)`,
        backgroundImage: (listener) =>
          `linear-gradient(to bottom, ${themeColor(listener, "shift-11", color)} 0%, transparent 100%)`,
        animation: `${opacityAnimationName} ${totalCycleSeconds.toFixed(2)}s ease-in-out ${delaySeconds.toFixed(2)}s infinite, ${rotateAnimationName} ${totalCycleSeconds.toFixed(2)}s ease-in-out ${delaySeconds.toFixed(2)}s infinite`,
        [`@keyframes ${opacityAnimationName}`]: opacityKeyframes,
        [`@keyframes ${rotateAnimationName}`]: rotateKeyframes,
      } as StyleObject,
    } as DomphyElement;
  });

  const defaultChildren: DomphyElement[] = [
    {
      div: [
        { h2: "Light Rays", $: [heading()] } as DomphyElement,
        {
          p: "Soft, blurred beams sway and pulse behind your content.",
          $: [paragraph()],
        } as DomphyElement,
      ],
      style: demoContentScrimStyle(),
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
      // Upstream root carries `isolate` — own stacking context so the rays'
      // mix-blend-mode:screen composites only within the component.
      isolation: "isolate",
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
