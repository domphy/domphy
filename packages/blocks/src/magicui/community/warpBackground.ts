// magicui "Warp Background" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// decorative wrapper that surrounds its child content with an animated 3D
// grid tunnel: four gridded planes (top/bottom/left/right) tilted in 3D
// space via CSS `perspective` + `preserve-3d` so they fan outward like the
// inside of an open box, each carrying a scattered set of softly glowing
// vertical "beam" bars that drift and fade on an infinite loop, while the
// wrapped content sits flat and centered above the tunnel.
//
// The grid lines are two perpendicular `repeating-linear-gradient`
// backgrounds (no image asset) using the theme's stroke/divider token
// (`shift-3`, per AGENTS.md's role mapping table). Each beam is a small
// absolutely-positioned span with a vertical gradient fill and a shared CSS
// `@keyframes` drift/fade loop; per-beam randomized inset, height (aspect),
// color role, and start delay (drawn once at generation time, like
// `meteors.ts`) make many beams overlap out of sync so the tunnel reads as
// continuously alive. This is a CSS-only substitute for the reference's
// animation-library beam tweens — same tradeoff `meteors.ts` documents: the
// loop replays the same path every cycle (only the initial delay is
// randomized, not a fresh position per loop), which would need a JS
// rAF-driven respawn loop instead of a plain infinite CSS animation to fully
// match a per-cycle-random reference.
//
// The reference implementation reportedly picks each beam's hue randomly
// across the full 0-360 hue wheel via literal `hsl()` gradient stops.
// Domphy's design system has no arbitrary-hue escape hatch (raw hex/rgb/hsl
// literals on style props are forbidden — theme tokens only), so beams
// instead draw from a rotating set of the theme's own color roles
// (`ThemeColor`), the same substitution `rainbowButton.ts` makes for its
// literal five-hue rainbow gradient.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { card, heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type WarpBackgroundPlaneSide = "top" | "bottom" | "left" | "right";

export interface WarpBackgroundProps {
  /** Content rendered flat and centered above the tunnel (e.g. a card). Defaults to a small demo card. */
  children?: DomphyElement | DomphyElement[];
  /** CSS `perspective` depth, in `themeSpacing` units — smaller reads as a stronger/closer tunnel. Defaults to `200`. */
  perspective?: number;
  /** Number of beams rendered per plane (×4 planes total). Defaults to `3`. */
  beamsPerSide?: number;
  /** Beam thickness, in `themeSpacing` units. Defaults to `1`. */
  beamSize?: number;
  /** Minimum randomized per-beam start delay, in seconds. Defaults to `0`. */
  beamDelayMin?: number;
  /** Maximum randomized per-beam start delay, in seconds. Defaults to `4`. */
  beamDelayMax?: number;
  /** One drift-and-fade cycle, in seconds. Defaults to `3`. */
  beamDuration?: number;
  /** Theme color family for the grid lines. Defaults to `"neutral"`. */
  gridColor?: ThemeColor;
  /** Color roles cycled across beams — approximates the reference's full-hue-wheel
   * randomization within Domphy's token system. Defaults to six built-in roles. */
  beamColors?: ThemeColor[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const DEFAULT_BEAM_COLORS: ThemeColor[] = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "error",
];

const PLANE_SIDES: WarpBackgroundPlaneSide[] = ["top", "bottom", "left", "right"];

/** Rotation applied to each plane so the four faces fan open into a tunnel under perspective. */
const PLANE_ROTATION: Record<WarpBackgroundPlaneSide, { origin: string; transform: string }> = {
  top: { origin: "top", transform: "rotateX(70deg)" },
  bottom: { origin: "bottom", transform: "rotateX(-70deg)" },
  left: { origin: "left", transform: "rotateY(-70deg)" },
  right: { origin: "right", transform: "rotateY(70deg)" },
};

/** Which half of the scene box each plane occupies before rotation. */
const PLANE_LAYOUT: Record<WarpBackgroundPlaneSide, StyleObject> = {
  top: { insetBlockStart: 0, insetInlineStart: 0, insetInlineEnd: 0, height: "50%" },
  bottom: { insetBlockEnd: 0, insetInlineStart: 0, insetInlineEnd: 0, height: "50%" },
  left: { insetBlockStart: 0, insetBlockEnd: 0, insetInlineStart: 0, width: "50%" },
  right: { insetBlockStart: 0, insetBlockEnd: 0, insetInlineEnd: 0, width: "50%" },
};

const GRID_CELL_UNITS = 8;

let warpBackgroundInstanceCounter = 0;

/** One glowing, drifting-and-fading vertical beam bar inside a plane. */
function warpBeam(
  side: WarpBackgroundPlaneSide,
  index: number,
  instanceId: number,
  beamSize: number,
  delayMin: number,
  delayMax: number,
  duration: number,
  color: ThemeColor,
  driftAnimationName: string,
): DomphyElement<"span"> {
  const leftPercent = Math.round(Math.random() * 100);
  const heightPercent = Math.round(40 + Math.random() * 55);
  const delaySeconds = (delayMin + Math.random() * Math.max(0, delayMax - delayMin)).toFixed(2);

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors meteors.ts).
  return {
    span: null,
    _key: `${side}-beam-${instanceId}-${index}`,
    ariaHidden: "true",
    // Decorative glow bar with no text of its own — exempt from the
    // missing-color contract, matching meteors.ts's dot/tail spans.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockEnd: 0,
      insetInlineStart: `${leftPercent}%`,
      width: themeSpacing(beamSize),
      height: `${heightPercent}%`,
      backgroundImage: (listener: Listener) =>
        `linear-gradient(to top, ${themeColor(listener, "shift-9", color)}, transparent)`,
      animation: `${driftAnimationName} ${duration}s linear ${delaySeconds}s infinite`,
    } as StyleObject,
  } as DomphyElement<"span">;
}

/** One tilted, gridded plane (top/bottom/left/right) making up one face of the tunnel. */
function warpPlane(
  side: WarpBackgroundPlaneSide,
  sideIndex: number,
  instanceId: number,
  beamsPerSide: number,
  beamSize: number,
  delayMin: number,
  delayMax: number,
  duration: number,
  gridColor: ThemeColor,
  beamColors: ThemeColor[],
  driftAnimationName: string,
  cellSize: string,
): DomphyElement<"div"> {
  const { origin, transform } = PLANE_ROTATION[side];

  const beams = Array.from({ length: beamsPerSide }, (_unused, index) =>
    warpBeam(
      side,
      index,
      instanceId,
      beamSize,
      delayMin,
      delayMax,
      duration,
      beamColors[(index + sideIndex) % beamColors.length],
      driftAnimationName,
    ),
  );

  return {
    div: beams,
    _key: `plane-${side}`,
    ariaHidden: "true",
    // Decorative grid backdrop with no text of its own — exempt from the
    // missing-color contract, matching meteors.ts's tail-gradient spans.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      overflow: "hidden",
      transformOrigin: origin,
      transform,
      backgroundImage: (listener: Listener) => {
        const line = themeColor(listener, "shift-3", gridColor);
        return (
          `repeating-linear-gradient(to right, ${line} 0, ${line} 1px, transparent 1px, transparent ${cellSize}), ` +
          `repeating-linear-gradient(to bottom, ${line} 0, ${line} 1px, transparent 1px, transparent ${cellSize})`
        );
      },
      ...PLANE_LAYOUT[side],
    } as StyleObject,
  } as DomphyElement<"div">;
}

function defaultWarpContent(): DomphyElement[] {
  return [
    {
      div: [
        { h3: "Warp Background", $: [heading()] } as DomphyElement,
        {
          p: "Wrapped content floats above an animated 3D grid tunnel.",
          $: [paragraph()],
        } as DomphyElement,
      ],
      $: [card({ color: "neutral" })],
      style: { maxWidth: themeSpacing(72) },
    } as DomphyElement,
  ];
}

/**
 * A decorative wrapper that surrounds its content with an animated 3D grid
 * tunnel — four tilted, gridded planes fanning outward around the wrapped
 * content, each scattered with softly glowing beams that drift and fade on
 * an infinite loop from the moment it mounts. Call with no arguments for a
 * working demo — a small card floating above a colorful drifting tunnel.
 */
function warpBackground(props: WarpBackgroundProps = {}): DomphyElement<"div"> {
  const instanceId = ++warpBackgroundInstanceCounter;
  const perspective = props.perspective ?? 200;
  const beamsPerSide = Math.max(1, Math.round(props.beamsPerSide ?? 3));
  const beamSize = props.beamSize ?? 1;
  const beamDelayMin = props.beamDelayMin ?? 0;
  const beamDelayMax = props.beamDelayMax ?? 4;
  const beamDuration = props.beamDuration ?? 3;
  const gridColor = props.gridColor ?? "neutral";
  const beamColors = props.beamColors && props.beamColors.length > 0 ? props.beamColors : DEFAULT_BEAM_COLORS;
  const cellSize = themeSpacing(GRID_CELL_UNITS);

  const driftAnimationName = `warp-background-drift-${hashString(
    JSON.stringify({ instanceId, beamDuration, beamDelayMin, beamDelayMax }),
  )}`;
  const driftKeyframes = {
    "0%": { transform: "translateY(30%)", opacity: 0 },
    "15%": { opacity: 1 },
    "85%": { opacity: 1 },
    "100%": { transform: "translateY(-130%)", opacity: 0 },
  };

  const planes = PLANE_SIDES.map((side, sideIndex) =>
    warpPlane(
      side,
      sideIndex,
      instanceId,
      beamsPerSide,
      beamSize,
      beamDelayMin,
      beamDelayMax,
      beamDuration,
      gridColor,
      beamColors,
      driftAnimationName,
      cellSize,
    ),
  );

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultWarpContent();

  return {
    div: [
      {
        div: planes,
        ariaHidden: "true",
        style: { position: "absolute", inset: 0, transformStyle: "preserve-3d" } as StyleObject,
      } as DomphyElement<"div">,
      {
        div: contentChildren,
        style: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      minHeight: themeSpacing(96),
      padding: themeSpacing(10),
      perspective: themeSpacing(perspective),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      [`@keyframes ${driftAnimationName}`]: driftKeyframes,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { warpBackground };
