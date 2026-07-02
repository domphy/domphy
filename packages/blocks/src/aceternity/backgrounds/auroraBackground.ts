// Aceternity UI "Aurora Background" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// full-viewport ambient backdrop simulating a soft aurora-borealis glow
// drifting slowly behind page content.
//
// Pure CSS, no JavaScript animation loop: an oversized layer (300% of the
// container in both axes) carries several `radial-gradient` "bands" as one
// combined `background-image`, tiled with `background-repeat`. Because the
// layer's own size is exactly one repeat tile, animating `background-position`
// by exactly one tile-width (`300%`) over the loop duration always ends
// exactly where a fresh untranslated tile would start — so the drift wraps
// seamlessly with no visible seam or reset, the same "shift by exactly one
// tile per cycle" idiom `retroGrid()` uses for its scrolling floor. An
// optional radial-gradient vignette overlay sits above it, and the caller's
// content renders above everything via `z-index`.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface AuroraBackgroundProps {
  /** Foreground content rendered above the effect. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Theme color roles used for the aurora bands. Defaults to `["primary", "secondary", "info"]`. */
  colors?: ThemeColor[];
  /** `"dark"` (default) reads as a deep backdrop with bright bands; `"light"` sits on a pale surface instead. */
  variant?: "dark" | "light";
  /** Toggles the radial-gradient vignette overlay on top. Defaults to `true`. */
  showRadialGradient?: boolean;
  /** Full drift-loop duration, in seconds. Defaults to `60`. */
  duration?: number;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let auroraBackgroundInstanceCounter = 0;

/** Seamless one-tile-per-cycle `background-position` drift, mirroring `retroGrid()`'s scroll keyframes. */
function buildDriftKeyframes() {
  return {
    "0%": { backgroundPosition: "0% 50%" },
    "100%": { backgroundPosition: "-300% 50%" },
  };
}

/**
 * Full-viewport ambient aurora-borealis glow, slowly and continuously
 * drifting behind the wrapped content. Call with no arguments for a working
 * demo — a dark panel with a drifting aurora behind a heading.
 */
function auroraBackground(props: AuroraBackgroundProps = {}): DomphyElement<"div"> {
  const instanceId = ++auroraBackgroundInstanceCounter;
  const colors = props.colors && props.colors.length > 0 ? props.colors : (["primary", "secondary", "info"] as ThemeColor[]);
  const variant = props.variant ?? "dark";
  const showRadialGradient = props.showRadialGradient ?? true;
  const duration = props.duration ?? 60;
  const surfaceTone = variant === "dark" ? "shift-15" : "shift-1";
  const bandTone = variant === "dark" ? "shift-9" : "shift-7";

  const driftKeyframes = buildDriftKeyframes();
  const driftAnimationName = `aurora-background-drift-${hashString(JSON.stringify({ instanceId, driftKeyframes }))}`;

  const bandPositions = [
    { x: 15, y: 25 },
    { x: 55, y: 15 },
    { x: 80, y: 55 },
    { x: 30, y: 70 },
  ];

  const auroraLayer: DomphyElement = {
    div: null,
    ariaHidden: "true",
    // Decorative gradient plane with no text of its own — exempt from the
    // missing-color contract (mirrors lightRays.ts's glow blobs).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: "-50%",
      pointerEvents: "none",
      mixBlendMode: "screen",
      filter: "blur(60px)",
      backgroundRepeat: "repeat",
      backgroundSize: "300% 300%",
      backgroundImage: (listener: Listener) =>
        bandPositions
          .map(
            (position, index) =>
              `radial-gradient(circle at ${position.x}% ${position.y}%, ${themeColor(listener, bandTone, colors[index % colors.length])} 0%, transparent 45%)`,
          )
          .join(", "),
      animation: `${driftAnimationName} ${duration}s linear infinite`,
      [`@keyframes ${driftAnimationName}`]: driftKeyframes,
      "@media (prefers-reduced-motion: reduce)": { animationPlayState: "paused" },
    } as StyleObject,
  } as DomphyElement;

  const vignetteOverlay: DomphyElement = {
    div: null,
    ariaHidden: "true",
    // Decorative vignette overlay with no text of its own.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: (listener: Listener) => `radial-gradient(ellipse at center, transparent 30%, ${themeColor(listener, "inherit")} 100%)`,
    } as StyleObject,
  } as DomphyElement;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Aurora Background", $: [heading()] } as DomphyElement,
        {
          p: "A soft aurora glow drifts slowly and continuously behind this content.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  return {
    div: [
      { div: [auroraLayer], ariaHidden: "true", style: { position: "absolute", inset: 0, overflow: "hidden" } as StyleObject } as DomphyElement,
      ...(showRadialGradient ? [vignetteOverlay] : []),
      { div: contentChildren, style: { position: "relative", zIndex: 1 } } as DomphyElement,
    ],
    dataTone: surfaceTone,
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(80),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      // A fixed "shift-9" regardless of the dark/light surface tone — the
      // relative tone system resolves it to a legible contrast either way
      // (same convention `glareHover()`'s own "surface" toggle uses).
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { auroraBackground };
