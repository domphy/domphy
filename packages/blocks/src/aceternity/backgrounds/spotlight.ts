// Aceternity UI "Spotlight" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A fixed,
// softly blurred radial glow shape positioned near the top of a dark hero
// section, angled so it reads as light spilling in from a corner rather than
// a flat circle, that plays a one-time fade/scale-in entrance on mount and
// then sits static — no pointer tracking, no repeat.
//
// The glow itself is a plain `<div>` with a heavily blurred radial-gradient
// background — no SVG asset needed. The one-time entrance is this package's
// `motion()` patch (Web Animations API): `initial` starts smaller, offset
// (translate percentages relative to the glow's own box, so it also drifts
// slightly into its resting position as it grows) and fully transparent;
// `animate` settles at full size/opacity in its resting position, after a
// short delay, over a slow ease, playing once (`motion()`'s default
// `iterations: 1`). A static `rotate` value is included in BOTH keyframes so
// the angled tilt itself never animates — only opacity/scale/position do.
// The glow's own persistent `style` intentionally omits opacity/transform
// entirely (matching this package's `blurFade.ts`): environments without
// WAAPI support (`el.animate`) simply render the glow at its resting
// appearance immediately rather than invisible forever.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { heading, motion, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface SpotlightProps {
  /** Theme color family for the glow. Defaults to `"neutral"` (a light, near-white glow against a dark section). */
  glowColor?: ThemeColor;
  /** Distance from the section's top edge, in px (can be negative to bleed above it). Defaults to `-20`. */
  top?: number;
  /** Distance from the section's left edge, in px. Ignored when `right` is set. Defaults to `-80`. */
  left?: number;
  /** Distance from the section's right edge, in px — set this instead of `left` to anchor from the right. */
  right?: number;
  /** Static tilt, in degrees. Defaults to `-45`. */
  rotation?: number;
  /** Glow ellipse width, in px. Defaults to `560`. */
  width?: number;
  /** Glow ellipse height, in px. Defaults to `1400`. */
  height?: number;
  /** Blur radius, in px (higher = softer, less defined edge). Defaults to `140`. */
  blur?: number;
  /** Delay before the entrance starts, in ms. Defaults to `750`. */
  delayMs?: number;
  /** Entrance duration, in ms. Defaults to `2000`. */
  durationMs?: number;
  /** Foreground content sitting on top of the section, above the glow. Defaults to a small demo hero blurb. */
  children?: DomphyElement | DomphyElement[];
  style?: StyleObject;
}

function defaultSpotlightContent(): DomphyElement[] {
  return [
    { h1: "Light from above", $: [heading({ color: "neutral" })] } as DomphyElement,
    {
      p: "A soft glow settles into place once, drawing the eye toward this section.",
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement,
  ];
}

/**
 * A fixed, softly blurred radial glow that fades and grows into place once
 * on mount, angled like light spilling in from a corner — non-interactive,
 * no pointer tracking, no repeat. Call with no arguments for a working demo
 * — a dark hero section with the glow settling in behind a heading.
 */
function spotlight(props: SpotlightProps = {}): DomphyElement<"div"> {
  const glowColor = props.glowColor ?? "neutral";
  const top = props.top ?? -20;
  const left = props.left;
  const right = props.right;
  const rotation = props.rotation ?? -45;
  const width = props.width ?? 560;
  const height = props.height ?? 1400;
  const blur = props.blur ?? 140;
  const delayMs = props.delayMs ?? 750;
  const durationMs = props.durationMs ?? 2000;

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultSpotlightContent();

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors lightRays.ts's glowBlob()).
  const glowElement = {
    div: null,
    ariaHidden: "true",
    // Decorative ambient glow with no text of its own — exempt from the
    // missing-color contract (mirrors lightRays.ts's glowBlob()).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      top: `${top}px`,
      left: right === undefined ? `${left ?? -80}px` : undefined,
      right: right === undefined ? undefined : `${right}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
      // Matches `motion()`'s `animate` end keyframe — environments without
      // WAAPI support (`el.animate`) render at this resting transform
      // immediately instead of an untransformed `top`/`left` position
      // (mirrors `blurFade.ts`'s "persistent style already IS the settled
      // appearance" convention; CSS's own `transform: none` default would
      // otherwise NOT match the intended resting position here).
      transform: `translate(-50%, -40%) rotate(${rotation}deg) scale(1)`,
      backgroundImage: (listener) =>
        `radial-gradient(closest-side, ${themeColor(listener, "shift-14", glowColor)}, transparent 80%)`,
      filter: `blur(${blur}px)`,
    } as StyleObject,
    $: [
      motion({
        initial: { opacity: 0, x: "-72%", y: "-62%", scale: 0.5, rotate: rotation },
        animate: { opacity: 1, x: "-50%", y: "-40%", scale: 1, rotate: rotation },
        transition: { duration: durationMs, delay: delayMs, easing: "ease" },
      }),
    ],
  } as DomphyElement<"div">;

  return {
    div: [
      glowElement,
      { div: contentChildren, style: { position: "relative", zIndex: 1 } } as DomphyElement,
    ],
    dataTone: "shift-17",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(10),
      minHeight: themeSpacing(96),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { spotlight };
