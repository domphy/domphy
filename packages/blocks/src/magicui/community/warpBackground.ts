// magicui "Warp Background" — Domphy translation of the upstream React
// component. A decorative wrapper that surrounds its child content with an
// animated 3D grid tunnel: four full-sized gridded planes (top/bottom/left/
// right) each folded a full right angle (±90°) around its outer edge under
// CSS `perspective` + `preserve-3d`, forming a box tunnel that recedes into
// depth. Each plane carries a scattered set of softly glowing vertical "beam"
// bars that drift upward on an infinite loop, while the wrapped content sits
// flat in normal flow above the tunnel.
//
// Plane sizing mirrors upstream exactly via container-query units: the scene
// wrapper is a `size` container and each plane spans `100cqi`/`100cqh` ×
// `100cqmax` of it; each plane is itself a container so its beams can travel
// `100cqmax` from bottom to top. The crosshatch grid is two tiled
// `linear-gradient` layers whose cell size is `beamSize%` (coupled to the
// beam width, exactly as upstream), using the theme's stroke token
// (`shift-3`) in place of upstream's `var(--border)`.
//
// Two documented substitutions vs. upstream, both mirroring existing repo
// precedent:
// (1) Beams drift via a shared CSS `@keyframes` loop with a per-beam
//     randomized `animation-delay` (drawn once at generation time) instead of
//     an animation-library tween per beam — the same technique meteors.ts
//     uses. Trade-off: the loop replays the same path each cycle rather than a
//     fresh random position per cycle.
// (2) Upstream picks each beam's hue randomly across the full 0–360 wheel via
//     literal `hsl()` stops. Domphy forbids raw hex/rgb/hsl color literals on
//     style props (theme tokens only), so beams instead cycle the theme's own
//     color roles (`ThemeColor`) — the same substitution rainbowButton.ts
//     makes for its literal five-hue rainbow gradient.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { card, heading, paragraph } from "@domphy/ui";

export type WarpBackgroundPlaneSide = "top" | "bottom" | "left" | "right";

export interface WarpBackgroundProps {
  /** Content rendered flat above the tunnel (e.g. a card). Defaults to a small demo card. */
  children?: DomphyElement | DomphyElement[];
  /** CSS `perspective` depth in px — smaller reads as a stronger/closer tunnel. Defaults to `100` (matching upstream). */
  perspective?: number;
  /** Number of beams rendered per plane (×4 planes total). Defaults to `3`. */
  beamsPerSide?: number;
  /** Beam width as a percentage of its plane, which ALSO sets the crosshatch grid cell size. Defaults to `5`. */
  beamSize?: number;
  /** Minimum randomized per-beam start delay, in seconds. Defaults to `0`. */
  beamDelayMin?: number;
  /** Maximum randomized per-beam start delay, in seconds. Defaults to `3`. */
  beamDelayMax?: number;
  /** One drift cycle, in seconds. Defaults to `3`. */
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

// Order matches upstream (top first). "top" carries z-index 20 so it paints
// above the other three walls at their overlap, exactly as upstream's ceiling
// plane does.
const PLANE_SIDES: WarpBackgroundPlaneSide[] = [
  "top",
  "bottom",
  "left",
  "right",
];

/**
 * Per-plane geometry, matching upstream's Tailwind classes 1:1:
 *   top:    absolute z-20 h-[100cqmax] w-[100cqi] origin-[50%_0%]  rotateX(-90deg)
 *   bottom: absolute top-full h-[100cqmax] w-[100cqi] origin-[50%_0%]  rotateX(-90deg)
 *   left:   absolute top-0 left-0 h-[100cqmax] w-[100cqh] origin-[0%_0%]   rotate(90deg) rotateX(-90deg)
 *   right:  absolute top-0 right-0 h-[100cqmax] w-[100cqh] origin-[100%_0%] rotate(-90deg) rotateX(-90deg)
 */
const PLANE_GEOMETRY: Record<
  WarpBackgroundPlaneSide,
  { origin: string; transform: string; layout: StyleObject }
> = {
  top: {
    origin: "50% 0%",
    transform: "rotateX(-90deg)",
    layout: {
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: "100cqi",
      height: "100cqmax",
      zIndex: 20,
    },
  },
  bottom: {
    origin: "50% 0%",
    transform: "rotateX(-90deg)",
    layout: {
      insetBlockStart: "100%",
      insetInlineStart: 0,
      width: "100cqi",
      height: "100cqmax",
    },
  },
  left: {
    origin: "0% 0%",
    transform: "rotate(90deg) rotateX(-90deg)",
    layout: {
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: "100cqh",
      height: "100cqmax",
    },
  },
  right: {
    origin: "100% 0%",
    transform: "rotate(-90deg) rotateX(-90deg)",
    layout: {
      insetBlockStart: 0,
      insetInlineEnd: 0,
      width: "100cqh",
      height: "100cqmax",
    },
  },
};

let warpBackgroundInstanceCounter = 0;

/** One glowing, drifting vertical beam bar inside a plane. */
function warpBeam(
  side: WarpBackgroundPlaneSide,
  index: number,
  instanceId: number,
  leftPercent: number,
  beamSize: number,
  aspectRatio: number,
  delaySeconds: string,
  duration: number,
  color: ThemeColor,
  driftAnimationName: string,
): DomphyElement<"span"> {
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
      // top-0 left-(x%), width beamSize%, aspect-ratio 1/ar — upstream's exact
      // Beam layout; `translateX(-50%)` (carried in the keyframe) centers it.
      insetBlockStart: 0,
      insetInlineStart: `${leftPercent}%`,
      width: `${beamSize}%`,
      aspectRatio: `1 / ${aspectRatio}`,
      // linear-gradient(color, transparent) = solid at the top (leading) edge,
      // fading downward — the comet points the way it travels (upward).
      backgroundImage: (listener: Listener) =>
        `linear-gradient(${themeColor(listener, "shift-9", color)}, transparent)`,
      // `both` holds the 0% frame (fully below) during the delay, matching
      // framer's `initial={{ y: "100cqmax" }}`.
      animation: `${driftAnimationName} ${duration}s linear ${delaySeconds}s infinite both`,
    } as StyleObject,
  } as DomphyElement<"span">;
}

/** One folded, gridded plane (top/bottom/left/right) making up one wall of the tunnel. */
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
): DomphyElement<"div"> {
  const { origin, transform, layout } = PLANE_GEOMETRY[side];
  const cell = `${beamSize}%`;

  // Upstream generateBeams(): evenly spaced cells across the plane width, so
  // beams spread out (only delay/hue are randomized), not cluster.
  const cellsPerSide = Math.floor(100 / beamSize);
  const stepSize = cellsPerSide / beamsPerSide;

  const beams = Array.from({ length: beamsPerSide }, (_unused, index) => {
    const cellIndex = Math.floor(index * stepSize);
    const leftPercent = cellIndex * beamSize; // 0%, 30%, 65% for the defaults
    const aspectRatio = Math.floor(Math.random() * 10) + 1;
    const delaySeconds = (
      delayMin +
      Math.random() * Math.max(0, delayMax - delayMin)
    ).toFixed(2);
    return warpBeam(
      side,
      index,
      instanceId,
      leftPercent,
      beamSize,
      aspectRatio,
      delaySeconds,
      duration,
      beamColors[(index + sideIndex) % beamColors.length],
      driftAnimationName,
    );
  });

  return {
    div: beams,
    _key: `plane-${side}`,
    ariaHidden: "true",
    // Decorative grid backdrop with no text of its own — exempt from the
    // missing-color contract, matching meteors.ts's tail-gradient spans.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      transformStyle: "preserve-3d",
      // `@container` on each plane so its beams' `100cqmax` resolves against
      // the plane (upstream marks every plane `@container`).
      containerType: "inline-size",
      transformOrigin: origin,
      transform,
      // Two tiled linear-gradient layers (horizontal + vertical hairlines) at
      // a `beamSize%` cell — upstream's exact crosshatch, cell coupled to beam
      // width. `var(--grid-color)` -> the theme stroke token.
      backgroundImage: (listener: Listener) => {
        const line = themeColor(listener, "shift-3", gridColor);
        return (
          `linear-gradient(${line} 0 1px, transparent 1px ${cell}), ` +
          `linear-gradient(90deg, ${line} 0 1px, transparent 1px ${cell})`
        );
      },
      backgroundPosition: "50% -0.5px, 50% 50%",
      backgroundSize: `${cell} ${cell}, ${cell} ${cell}`,
      ...layout,
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
 * tunnel — four full-sized planes folded into a box that recedes into depth,
 * each scattered with softly glowing beams that drift upward on an infinite
 * loop from the moment it mounts. Call with no arguments for a working demo —
 * a small card floating above a drifting tunnel.
 */
function warpBackground(props: WarpBackgroundProps = {}): DomphyElement<"div"> {
  const instanceId = ++warpBackgroundInstanceCounter;
  const perspective = props.perspective ?? 100;
  const beamsPerSide = Math.max(1, Math.round(props.beamsPerSide ?? 3));
  const beamSize = props.beamSize ?? 5;
  const beamDelayMin = props.beamDelayMin ?? 0;
  const beamDelayMax = props.beamDelayMax ?? 3;
  const beamDuration = props.beamDuration ?? 3;
  const gridColor = props.gridColor ?? "neutral";
  const beamColors =
    props.beamColors && props.beamColors.length > 0
      ? props.beamColors
      : DEFAULT_BEAM_COLORS;

  const driftAnimationName = `warp-background-drift-${hashString(
    JSON.stringify({ instanceId, beamDuration, beamDelayMin, beamDelayMax }),
  )}`;
  // Upstream framer motion: y from 100cqmax (below the plane) to -100% (above),
  // x held at -50%. No opacity tween — the fade is entirely the gradient.
  const driftKeyframes = {
    "0%": { transform: "translateX(-50%) translateY(100cqmax)" },
    "100%": { transform: "translateX(-50%) translateY(-100%)" },
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
        // Scene wrapper: the perspective + preserve-3d container and the
        // `size` query container the planes size against.
        div: planes,
        ariaHidden: "true",
        style: {
          pointerEvents: "none",
          position: "absolute",
          insetBlockStart: 0,
          insetInlineStart: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          clipPath: "inset(0)",
          containerType: "size",
          perspective: `${perspective}px`,
          transformStyle: "preserve-3d",
        } as StyleObject,
      } as DomphyElement<"div">,
      {
        // Upstream wraps children in a plain `relative` div — natural flow,
        // no centering.
        div: contentChildren,
        style: { position: "relative" } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-15",
    style: {
      // Upstream root: `relative rounded border p-20`.
      position: "relative",
      borderRadius: themeSpacing(1),
      border: (listener: Listener) =>
        `1px solid ${themeColor(listener, "shift-3", gridColor)}`,
      padding: themeSpacing(20),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      [`@keyframes ${driftAnimationName}`]: driftKeyframes,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { warpBackground };
