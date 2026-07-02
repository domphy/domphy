// Aceternity UI "Background Lines" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// light hero backdrop scattered with dozens of thin, individually colored
// line strokes whose visible dash continuously travels along its own path,
// reading as ambient, low-key, confetti-like motion behind centered content.
//
// Pure CSS, no JS animation loop: each generated quadratic-bezier path's own
// arc length is approximated analytically (sampling points along the curve
// and summing segment distances — the same "compute path geometry with plain
// math, no DOM measurement" idiom `googleGeminiEffect.ts` uses for its own
// generated ribbons) rather than measured via `SVGPathElement.getTotalLength()`
// at mount time — these are static generated paths, not scroll-tied dynamic
// content like `tracingBeam.ts`'s beam, so the length is knowable up front.
// A short `stroke-dasharray` fraction of that length plus a *per-path*
// `@keyframes` block that shifts `stroke-dashoffset` by exactly one full
// dash+gap period produces a "traveling dash" that loops perfectly
// regardless of the path's own on-screen shape. Each path gets its own
// randomized duration/delay (relative to the shared `svgOptions.duration`
// base) so dozens of dashes travel independently rather than in lockstep —
// the "differently-timed `animation` values" idiom `meteors.ts` and
// `shootingStars.ts` already use elsewhere in this package, generalized here
// to a differently-*shaped* keyframe per element since every path's own
// pattern period differs (not just its timing).

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface BackgroundLinesSvgOptions {
  /** Seconds per full dash-travel cycle of a path, before per-path randomization. Defaults to `10`. */
  duration?: number;
}

export interface BackgroundLinesProps {
  /** Content layered above the line scatter. Defaults to a small demo heading/subtext. */
  children?: DomphyElement | DomphyElement[];
  /** Number of scattered line strokes. Defaults to `40`. */
  lineCount?: number;
  /** Theme color families cycled across the scattered strokes. Defaults to a broad 9-role palette spanning this theme's built-in families. */
  colors?: ThemeColor[];
  /** SVG animation tuning. */
  svgOptions?: BackgroundLinesSvgOptions;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const RAINBOW_PALETTE: ThemeColor[] = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "attention",
  "error",
  "danger",
  "highlight",
];

interface QuadraticPoint {
  x: number;
  y: number;
}

interface LineSegment {
  key: string;
  d: string;
  arcLength: number;
  color: ThemeColor;
  durationSeconds: number;
  delaySeconds: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function quadraticPointAt(start: QuadraticPoint, control: QuadraticPoint, end: QuadraticPoint, t: number): QuadraticPoint {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
    y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
  };
}

/** Approximates a quadratic bezier's arc length by summing distances between sampled points — no DOM measurement needed. */
function approximateQuadraticArcLength(start: QuadraticPoint, control: QuadraticPoint, end: QuadraticPoint, sampleCount = 16): number {
  let previous = start;
  let total = 0;
  for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex += 1) {
    const point = quadraticPointAt(start, control, end, sampleIndex / sampleCount);
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return total;
}

/** A short, gently curved stroke at a random position/angle within a 0-100 viewBox. */
function buildScatteredLine(index: number, colors: ThemeColor[], baseDuration: number): LineSegment {
  const start: QuadraticPoint = { x: Math.random() * 100, y: Math.random() * 100 };
  const angleRad = Math.random() * Math.PI * 2;
  const length = randomBetween(8, 20);
  const end: QuadraticPoint = {
    x: start.x + Math.cos(angleRad) * length,
    y: start.y + Math.sin(angleRad) * length,
  };
  // Small perpendicular bow through the midpoint keeps the stroke a gentle
  // curve rather than a perfectly straight segment.
  const control: QuadraticPoint = {
    x: (start.x + end.x) / 2 - Math.sin(angleRad) * randomBetween(-3, 3),
    y: (start.y + end.y) / 2 + Math.cos(angleRad) * randomBetween(-3, 3),
  };

  return {
    key: `background-line-${index}`,
    d: `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q${control.x.toFixed(1)} ${control.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    arcLength: Math.max(1, approximateQuadraticArcLength(start, control, end)),
    color: colors[index % colors.length],
    durationSeconds: baseDuration * randomBetween(0.6, 1.4),
    delaySeconds: randomBetween(0, baseDuration),
  };
}

function defaultLinesContent(): DomphyElement[] {
  return [
    { h2: "Background Lines", $: [heading()] } as DomphyElement,
    {
      p: "Dozens of scattered strokes, each with its own dash quietly traveling its path.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

let backgroundLinesInstanceCounter = 0;

/**
 * A light hero backdrop scattered with dozens of thin, colored line strokes
 * whose visible dash continuously travels along its own path — a pure-CSS,
 * ambient confetti-like scatter. Call with no arguments for a working demo —
 * 40 scattered strokes in a 9-role rainbow palette behind a heading.
 */
function backgroundLines(props: BackgroundLinesProps = {}): DomphyElement<"div"> {
  const instanceId = ++backgroundLinesInstanceCounter;
  const lineCount = Math.max(1, Math.round(props.lineCount ?? 40));
  const colors = props.colors && props.colors.length > 0 ? props.colors : RAINBOW_PALETTE;
  const baseDuration = Math.max(0.5, props.svgOptions?.duration ?? 10);

  const lines = Array.from({ length: lineCount }, (_unused, index) => buildScatteredLine(index, colors, baseDuration));

  // Per-path @keyframes, merged onto the shared <svg>'s style object — each
  // path's pattern period (dash + gap) equals its own arc length, so a
  // shared block can't be reused the way `meteors.ts` reuses one keyframe
  // for many identically-shaped meteors.
  const keyframesByName: Record<string, unknown> = {};

  const lineElements: DomphyElement[] = lines.map((line) => {
    const dash = line.arcLength * 0.06;
    const gap = line.arcLength * 0.94;
    const animationName = `background-line-travel-${hashString(`${instanceId}-${line.key}`)}`;
    keyframesByName[`@keyframes ${animationName}`] = {
      "0%": { strokeDashoffset: 0 },
      "100%": { strokeDashoffset: -line.arcLength },
    };

    return {
      path: null,
      _key: line.key,
      d: line.d,
      fill: "none",
      strokeWidth: "0.6",
      strokeLinecap: "round",
      // Dash is 6% of this path's own approximated arc length, 94% gap —
      // animating the offset by exactly one dash+gap period loops seamlessly.
      style: {
        strokeDasharray: `${dash.toFixed(2)} ${gap.toFixed(2)}`,
        animation: `${animationName} ${line.durationSeconds.toFixed(2)}s linear ${line.delaySeconds.toFixed(2)}s infinite`,
        stroke: (listener: Listener) => themeColor(listener, "shift-9", line.color),
      } as StyleObject,
      // Decorative stroke with no text of its own — exempt from the
      // missing-color contract (mirrors backgroundBeams.ts's own paths).
      _doctorDisable: "missing-color",
    } as DomphyElement;
  });

  const svgLayer: DomphyElement<"svg"> = {
    svg: lineElements,
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      ...keyframesByName,
    } as StyleObject,
  } as DomphyElement<"svg">;

  const contentChildren = props.children ? (Array.isArray(props.children) ? props.children : [props.children]) : defaultLinesContent();

  return {
    div: [svgLayer, { div: contentChildren, style: { position: "relative", zIndex: 1 } } as DomphyElement],
    dataTone: "shift-1",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(10),
      minHeight: themeSpacing(80),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { backgroundLines };
