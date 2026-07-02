// Magic UI "Retro Grid" — clean-room reimplementation.
//
// A synthwave-style animated perspective floor grid that scrolls toward the
// viewer, typically used as a full-bleed hero background. Implemented purely
// from the block's public functional/visual spec — no upstream Magic UI
// source was viewed or copied.
//
// Per the spec's own research note, this uses the simplest faithful
// technique rather than the production version's per-pixel fragment-shader
// ray-cast: a large tiled `repeating-linear-gradient` "floor" plane (the
// lines are drawn as a CSS background image, not individual DOM/SVG
// elements) sits inside a 3D `perspective` container and is tilted with
// `rotateX(angle)` so it reads as a floor receding to a horizon. The
// "flying toward the camera" motion is a single `linear infinite` CSS
// `@keyframes` that shifts `background-position` by exactly one grid tile
// per cycle, so the loop is seamless with no JS animation frame needed. A
// full-size top-to-bottom gradient overlay div sits on top to fade the
// horizon into the surrounding surface color. Distant-line thinning/LOD (the
// production version's anti-aliasing refinement) is intentionally out of
// scope — see `fidelityNotes`.
//
// The spec's `lightLineColor`/`darkLineColor` props exist upstream because
// plain CSS custom properties don't auto-adapt without a duplicated
// `dark:` variant. Domphy's own `themeColor()` tone system already re-
// resolves per the active theme context, so both props are kept here purely
// for API fidelity and are additionally layered under a
// `prefers-color-scheme: dark` media override — see `fidelityNotes` for why
// that's an OS-level (not Domphy-theme-level) switch.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface RetroGridProps {
  /** Floor tilt, in degrees. Defaults to `65`. */
  angle?: number;
  /** Grid spacing, in px. Defaults to `60`. */
  cellSize?: number;
  /** Overall grid opacity. Defaults to `0.5`. */
  opacity?: number;
  /** Line color family used under a light color scheme. Defaults to `"neutral"`. */
  lightLineColor?: ThemeColor;
  /** Line color family used under `prefers-color-scheme: dark`. Defaults to `"neutral"`. */
  darkLineColor?: ThemeColor;
  /** Foreground content layered above the grid. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let retroGridInstanceCounter = 0;

/** One-tile-per-cycle `background-position` scroll, seamless because it always ends exactly one tile past where it started. */
function buildScrollKeyframes(cellSize: number) {
  return {
    "0%": { backgroundPosition: "0px 0px" },
    "100%": { backgroundPosition: `0px ${cellSize}px` },
  };
}

/** Two layered `repeating-linear-gradient`s (horizontal + vertical hairlines) standing in for a tiled grid-line background image. */
function buildGridBackgroundImage(lineColor: string, cellSize: number): string {
  const vertical = `repeating-linear-gradient(90deg, ${lineColor} 0px, ${lineColor} 1px, transparent 1px, transparent ${cellSize}px)`;
  const horizontal = `repeating-linear-gradient(0deg, ${lineColor} 0px, ${lineColor} 1px, transparent 1px, transparent ${cellSize}px)`;
  return `${vertical}, ${horizontal}`;
}

/**
 * A synthwave-style perspective floor grid, continuously scrolling toward
 * the viewer, meant as a full-bleed hero background. Call with no arguments
 * for a working demo — a dark panel with the scrolling grid behind a
 * heading.
 */
function retroGrid(props: RetroGridProps = {}): DomphyElement<"div"> {
  const angle = props.angle ?? 65;
  const cellSize = Math.max(1, props.cellSize ?? 60);
  const opacity = props.opacity ?? 0.5;
  const lightLineColor = props.lightLineColor ?? "neutral";
  const darkLineColor = props.darkLineColor ?? "neutral";

  const instanceId = ++retroGridInstanceCounter;
  const scrollKeyframes = buildScrollKeyframes(cellSize);
  const scrollAnimationName = `retro-grid-scroll-${hashString(
    JSON.stringify({ instanceId, scrollKeyframes }),
  )}`;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Retro Grid", $: [heading()] } as DomphyElement,
        {
          p: "A synthwave floor grid scrolling endlessly toward the viewer.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  const floorPlane: DomphyElement = {
    div: null,
    ariaHidden: "true",
    // Decorative background-image plane, no text of its own.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      top: 0,
      left: "-50%",
      width: "200%",
      height: "200%",
      transform: `rotateX(${angle}deg)`,
      transformOrigin: "top",
      opacity,
      backgroundImage: (listener: Listener) =>
        buildGridBackgroundImage(themeColor(listener, "shift-6", lightLineColor), cellSize),
      backgroundSize: `${cellSize}px ${cellSize}px`,
      animation: `${scrollAnimationName} 15s linear infinite`,
      [`@keyframes ${scrollAnimationName}`]: scrollKeyframes,
      "@media (prefers-color-scheme: dark)": {
        backgroundImage: (listener: Listener) =>
          buildGridBackgroundImage(themeColor(listener, "shift-9", darkLineColor), cellSize),
      },
      "@media (prefers-reduced-motion: reduce)": { animationPlayState: "paused" },
    } as StyleObject,
  } as DomphyElement;

  const horizonOverlay: DomphyElement = {
    div: null,
    ariaHidden: "true",
    // Decorative fade overlay, no text of its own.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: (listener: Listener) =>
        `linear-gradient(to bottom, ${themeColor(listener, "inherit")} 0%, transparent 70%)`,
    } as StyleObject,
  } as DomphyElement;

  const perspectiveWrapper: DomphyElement = {
    div: [floorPlane, horizonOverlay],
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      pointerEvents: "none",
      perspective: "200px",
    } as StyleObject,
  } as DomphyElement;

  return {
    div: [
      perspectiveWrapper,
      { div: contentChildren, style: { position: "relative", zIndex: 1 } },
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { retroGrid };
