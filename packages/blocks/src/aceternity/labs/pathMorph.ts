// Aceternity UI "SVG Path Morphing" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// toggle icon button whose glyph reshapes continuously between a two-bar
// "pause" silhouette and a right-pointing "play" triangle.
//
// Reliable cross-browser interpolation of an SVG `d` attribute needs both
// shapes to share the same point count/order — the spec's own research note
// says as much. Rather than trust the Web Animations API to animate the raw
// `d` string (support for animating `d` as a CSS property is inconsistent
// across engines, and jsdom's `Element.animate` is a no-op stub that would
// silently skip the whole effect), both glyphs are authored here as two
// 4-point polygons with a fixed index correspondence, and the morph is driven
// by a manual `requestAnimationFrame` tween that lerps each point pair and
// writes the resulting "M/L/L/L Z" string to `d` every frame — the same
// "no bundled spring/tween engine, so drive it by hand" tradeoff
// tracingBeam.ts/smoothCursor.ts/numberTicker.ts make for other effects that
// need to animate something other than `transform`/`opacity`.
//
// Left bar -> its right edge collapses into the triangle's apex (index 1 and
// 2 both map to the apex point), so its left edge continues to read as the
// triangle's flat left edge. Right bar -> all four of its points converge on
// that same apex, so it visually "flies in" and merges with the left bar's
// tip rather than fading independently — the "bars visually merge/reshape
// into the triangle" read the spec describes.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

type MorphPoint = [number, number];

export interface PathMorphProps {
  /** Playing/paused value. Pass a `State<boolean>` for controlled external control (the
   * click handler still toggles it); a plain boolean seeds an internal, uncontrolled state.
   * Defaults to `true` (renders the two-bar "pause" glyph at rest, matching the reference demo). */
  playing?: ValueOrState<boolean>;
  onToggle?: (playing: boolean) => void;
  /** Button side length, in `themeSpacing` units. Defaults to `11` (~44px at the base font size). */
  sizeUnits?: number;
  /** Color family for the button's dark track and its light glyph. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Morph duration, in ms. Defaults to `240` — "well under half a second". */
  duration?: number;
  ariaLabel?: { play: string; pause: string };
  style?: StyleObject;
}

// Both glyphs authored on a shared 0-24 viewBox, as two 4-point polygons with
// a fixed index correspondence (see file header for the point-mapping story).
const PAUSE_LEFT_BAR: MorphPoint[] = [
  [7.1, 5],
  [11.3, 5],
  [10.1, 19],
  [5.9, 19],
];
const PAUSE_RIGHT_BAR: MorphPoint[] = [
  [13.9, 5],
  [18.1, 5],
  [16.9, 19],
  [12.7, 19],
];
const PLAY_TRIANGLE_APEX: MorphPoint = [18.5, 12];
const PLAY_FROM_LEFT_BAR: MorphPoint[] = [[7.5, 5], PLAY_TRIANGLE_APEX, PLAY_TRIANGLE_APEX, [7.5, 19]];
const PLAY_FROM_RIGHT_BAR: MorphPoint[] = [
  PLAY_TRIANGLE_APEX,
  PLAY_TRIANGLE_APEX,
  PLAY_TRIANGLE_APEX,
  PLAY_TRIANGLE_APEX,
];

function lerpPoints(from: MorphPoint[], to: MorphPoint[], t: number): MorphPoint[] {
  return from.map(([fromX, fromY], index) => {
    const [toX, toY] = to[index];
    return [fromX + (toX - fromX) * t, fromY + (toY - fromY) * t] as MorphPoint;
  });
}

function pointsToPath(points: MorphPoint[]): string {
  const [[startX, startY], ...rest] = points;
  const lines = rest.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} ${lines} Z`;
}

/** Ease-out cubic — fast start, gentle settle, no overshoot (overshoot would make the
 * point-count-padded polygons above self-intersect mid-morph). */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Drives a single bar-to-triangle (or triangle-to-bar) polygon morph on one `<path>` element. */
function createPolygonMorphDriver(pathElement: SVGPathElement, restPoints: MorphPoint[], targetPoints: MorphPoint[]) {
  let currentPoints = restPoints;
  let rafId: number | null = null;

  const setPoints = (points: MorphPoint[]) => {
    currentPoints = points;
    pathElement.setAttribute("d", pointsToPath(points));
  };
  setPoints(restPoints);

  const animateTo = (toPlaying: boolean, durationMs: number) => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    const from = currentPoints;
    const to = toPlaying ? restPoints : targetPoints;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
      setPoints(lerpPoints(from, to, easeOutCubic(t)));
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        rafId = null;
      }
    };
    rafId = requestAnimationFrame(step);
  };

  const dispose = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
  };

  return { animateTo, dispose };
}

/**
 * A toggle icon button whose glyph continuously reshapes between a two-bar
 * "pause" silhouette and a right-pointing "play" triangle, by directly
 * interpolating the underlying SVG path data. Call with no arguments for a
 * working demo — a dark circular button, morphing on click.
 */
function pathMorph(props: PathMorphProps = {}): DomphyElement<"button"> {
  const playingState = toState(props.playing ?? true);
  const sizeUnits = props.sizeUnits ?? 11;
  const color = props.color ?? "neutral";
  const duration = props.duration ?? 240;
  const labels = props.ariaLabel ?? { play: "Play", pause: "Pause" };

  const toggle = () => {
    const nextPlaying = !playingState.get();
    playingState.set(nextPlaying);
    props.onToggle?.(nextPlaying);
  };

  let leftBarDriver: ReturnType<typeof createPolygonMorphDriver> | null = null;
  let rightBarDriver: ReturnType<typeof createPolygonMorphDriver> | null = null;
  let releasePlayingListener: (() => void) | null = null;

  const leftBarPath: DomphyElement<"path"> = {
    path: null,
    d: pointsToPath(PAUSE_LEFT_BAR),
    fill: "currentColor",
    _onMount: (node: ElementNode) => {
      const element = node.domElement as SVGPathElement | null;
      if (!element || typeof requestAnimationFrame !== "function") return;
      leftBarDriver = createPolygonMorphDriver(element, PAUSE_LEFT_BAR, PLAY_FROM_LEFT_BAR);
      if (!playingState.get()) leftBarDriver.animateTo(false, 0);
    },
    _onRemove: () => leftBarDriver?.dispose(),
  };

  const rightBarPath: DomphyElement<"path"> = {
    path: null,
    d: pointsToPath(PAUSE_RIGHT_BAR),
    fill: "currentColor",
    _onMount: (node: ElementNode) => {
      const element = node.domElement as SVGPathElement | null;
      if (!element || typeof requestAnimationFrame !== "function") return;
      rightBarDriver = createPolygonMorphDriver(element, PAUSE_RIGHT_BAR, PLAY_FROM_RIGHT_BAR);
      if (!playingState.get()) rightBarDriver.animateTo(false, 0);
    },
    _onRemove: () => rightBarDriver?.dispose(),
  };

  return {
    button: [
      {
        svg: [leftBarPath, rightBarPath],
        viewBox: "0 0 24 24",
        role: "img",
        ariaHidden: "true",
        style: { width: "55%", height: "55%", display: "block" },
      } as DomphyElement<"svg">,
    ],
    type: "button",
    ariaLabel: (listener: Listener) => (playingState.get(listener) ? labels.pause : labels.play),
    onClick: toggle,
    dataTone: "shift-17",
    _onMount: (node: ElementNode) => {
      releasePlayingListener = playingState.addListener((nextPlaying: boolean) => {
        leftBarDriver?.animateTo(nextPlaying, duration);
        rightBarDriver?.animateTo(nextPlaying, duration);
      });
      node.addHook("Remove", () => releasePlayingListener?.());
    },
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(sizeUnits),
      height: themeSpacing(sizeUnits),
      border: "none",
      borderRadius: "50%",
      cursor: "pointer",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", color),
      color: (listener: Listener) => themeColor(listener, "shift-11", color),
      transition: "background-color 150ms ease",
      "&:hover": { backgroundColor: (listener: Listener) => themeColor(listener, "increase-1", color) },
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { pathMorph };
