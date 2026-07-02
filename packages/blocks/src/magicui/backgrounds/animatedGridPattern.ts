// Magic UI "Animated Grid Pattern" — clean-room reimplementation.
//
// A faint SVG line-grid background overlaid with a fixed population of
// randomly-placed filled cells that each fade in, hold, fade out, then jump
// to a new random cell and repeat — a "data grid coming alive" effect.
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.
//
// The static line grid reuses the same SVG `<pattern>` tiling technique as
// this package's sibling `gridPattern` (see that file's header for why it
// needs no JS measurement at all). The animated squares are a fixed set of
// `<rect>` elements, each driven by ONE shared CSS `@keyframes` (opacity
// 0 → maxOpacity → 0, i.e. a symmetric fade-in/fade-out with no explicit
// hold — mirroring the spec's "animate up once, then mirror the same tween
// in reverse") with a per-index `animation-delay` spread evenly across one
// full cycle length so the population is continuously staggered rather than
// pulsing in lockstep. Because both ends of the keyframe sit at `opacity: 0`,
// the loop point is seamless — a plain CSS `infinite` iteration count already
// gives the "fade out, wait `repeatDelay`, fade back in" cadence with no JS
// timer needed. Re-rolling a square's grid cell on every completed cycle
// (which pure CSS cannot do — a cell's position isn't animatable state) is
// handled by listening for the DOM `animationiteration` event, which fires at
// exactly the loop boundary (both ends already sit at 0 opacity, so the
// reposition is invisible). A `ResizeObserver` on the outer `<svg>` recomputes
// the column/row count and snaps every square onto the new grid whenever the
// container resizes.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface AnimatedGridPatternProps {
  /** Grid cell width, in px. Defaults to `40`. */
  width?: number;
  /** Grid cell height, in px. Defaults to `40`. */
  height?: number;
  /** Pattern horizontal offset, in px. Defaults to `-1`. */
  x?: number;
  /** Pattern vertical offset, in px. Defaults to `-1`. */
  y?: number;
  /** Solid vs dashed line style, e.g. `"4 2"`. Defaults to solid (`undefined`). */
  strokeDasharray?: string;
  /** How many animated cells to show at once. Defaults to `50`. */
  numSquares?: number;
  /** Peak fade-in opacity for an animated square. Defaults to `0.5`. */
  maxOpacity?: number;
  /** Full fade-in + fade-out duration, in seconds. Defaults to `4`. */
  duration?: number;
  /** Pause, in seconds, once a square fades back to `0` before it re-rolls position and fades in again. Defaults to `0.5`. */
  repeatDelay?: number;
  /** Theme color family for the lines and animated squares. Defaults to `"neutral"`. */
  color?: ThemeColor;
  style?: StyleObject;
}

let animatedGridPatternInstanceCounter = 0;

// Pre-mount fallback container size used only to seed the initial random
// square positions before the real container has been measured — corrected
// immediately by the `ResizeObserver` once mounted in a real browser.
const FALLBACK_CONTAINER_WIDTH = 1024;
const FALLBACK_CONTAINER_HEIGHT = 600;

function pickRandomCell(columns: number, rows: number): { column: number; row: number } {
  return {
    column: Math.floor(Math.random() * Math.max(1, columns)),
    row: Math.floor(Math.random() * Math.max(1, rows)),
  };
}

/**
 * A faint SVG line grid overlaid with animated squares that fade in/out and
 * jump to a new random cell each cycle. Call with no arguments for a working
 * demo — a dark panel with 50 staggered pulsing cells behind a heading.
 */
function animatedGridPattern(props: AnimatedGridPatternProps = {}): DomphyElement<"div"> {
  const width = props.width ?? 40;
  const height = props.height ?? 40;
  const x = props.x ?? -1;
  const y = props.y ?? -1;
  const strokeDasharray = props.strokeDasharray;
  const numSquares = Math.max(1, Math.round(props.numSquares ?? 50));
  const maxOpacity = props.maxOpacity ?? 0.5;
  const duration = Math.max(0.1, props.duration ?? 4);
  const repeatDelay = Math.max(0, props.repeatDelay ?? 0.5);
  const color = props.color ?? "neutral";

  const instanceId = ++animatedGridPatternInstanceCounter;
  const patternId = `domphy-animated-grid-pattern-${instanceId}`;

  // Mutable, shared via closure with both the outer `<svg>`'s ResizeObserver
  // and every square's `animationiteration` handler below — corrected to the
  // real measured size as soon as the tree mounts in a browser.
  let currentColumns = Math.max(1, Math.ceil(FALLBACK_CONTAINER_WIDTH / width));
  let currentRows = Math.max(1, Math.ceil(FALLBACK_CONTAINER_HEIGHT / height));

  const totalCycleSeconds = duration + repeatDelay;
  const fadeInEndPercent = ((duration / 2 / totalCycleSeconds) * 100).toFixed(4);
  const fadeOutEndPercent = ((duration / totalCycleSeconds) * 100).toFixed(4);
  const keyframes = {
    "0%": { opacity: 0 },
    [`${fadeInEndPercent}%`]: { opacity: maxOpacity },
    [`${fadeOutEndPercent}%`]: { opacity: 0 },
    "100%": { opacity: 0 },
  };
  const animationName = `animated-grid-pattern-fade-${hashString(
    JSON.stringify({ instanceId, keyframes }),
  )}`;

  const patternElement: DomphyElement = {
    pattern: [
      {
        path: null,
        d: `M ${width} 0 L 0 0 0 ${height}`,
        fill: "none",
        // Decorative line path, no text of its own.
        _doctorDisable: "missing-color",
        style: {
          stroke: (listener: Listener) => themeColor(listener, "shift-4", color),
          strokeDasharray,
        } as StyleObject,
      } as DomphyElement,
    ],
    id: patternId,
    width,
    height,
    patternUnits: "userSpaceOnUse",
    x,
    y,
  } as DomphyElement;

  const squareElements: DomphyElement[] = Array.from({ length: numSquares }, (_unused, index) => {
    const cell = pickRandomCell(currentColumns, currentRows);
    const staggerDelaySeconds = (index * totalCycleSeconds) / numSquares;

    return {
      rect: null,
      _key: `square-${instanceId}-${index}`,
      dataAnimatedSquare: "true",
      x: cell.column * width + x,
      y: cell.row * height + y,
      width,
      height,
      ariaHidden: "true",
      // Decorative fill-only rect, no text of its own.
      _doctorDisable: "missing-color",
      style: {
        fill: (listener: Listener) => themeColor(listener, "shift-9", color),
        animation: `${animationName} ${totalCycleSeconds}s ease-in-out ${staggerDelaySeconds}s infinite`,
        [`@keyframes ${animationName}`]: keyframes,
      } as StyleObject,
      _onMount: (node: ElementNode) => {
        const element = node.domElement as SVGRectElement | null;
        if (!element || typeof window === "undefined") return;

        const handleIteration = () => {
          const nextCell = pickRandomCell(currentColumns, currentRows);
          element.setAttribute("x", String(nextCell.column * width + x));
          element.setAttribute("y", String(nextCell.row * height + y));
        };
        element.addEventListener("animationiteration", handleIteration);
        node.addHook("Remove", () => {
          element.removeEventListener("animationiteration", handleIteration);
        });
      },
    } as DomphyElement;
  });

  const gridSvg: DomphyElement = {
    svg: [
      { defs: [patternElement] } as DomphyElement,
      {
        rect: null,
        width: "100%",
        height: "100%",
        style: { fill: `url(#${patternId})` } as StyleObject,
      } as DomphyElement,
      {
        svg: squareElements,
        _key: "animated-squares-layer",
        width: "100%",
        height: "100%",
        // Mount hooks fire top-down and BEFORE a node's own children are
        // appended (see `ElementNode.render`'s recursion order), so this
        // layer's own children (the `<rect>` squares) aren't in the DOM yet
        // at the moment this fires. `ResizeObserver` callbacks are always
        // asynchronous though — by the time even its first auto-fired
        // invocation runs, the whole tree (mounted synchronously from a
        // single top-level `render()` call) is guaranteed complete, so the
        // `querySelectorAll` below is safe there. No separate synchronous
        // "initial" call is made — the observer's own first callback covers
        // it (and jsdom/non-browser runtimes without `ResizeObserver` simply
        // keep the build-time fallback-grid positions).
        _onMount: (node: ElementNode) => {
          const svgElement = node.domElement as SVGSVGElement | null;
          if (!svgElement || typeof window === "undefined") return;
          if (typeof ResizeObserver === "undefined") return;

          const resizeObserver = new ResizeObserver(() => {
            const rect = svgElement.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            currentColumns = Math.max(1, Math.ceil(rect.width / width));
            currentRows = Math.max(1, Math.ceil(rect.height / height));
            // Snap every animated square onto the freshly measured grid so
            // none sit outside the now-known visible area.
            const squareNodes = svgElement.querySelectorAll("[data-animated-square]");
            for (const squareNode of Array.from(squareNodes)) {
              const cell = pickRandomCell(currentColumns, currentRows);
              squareNode.setAttribute("x", String(cell.column * width + x));
              squareNode.setAttribute("y", String(cell.row * height + y));
            }
          });
          resizeObserver.observe(svgElement);

          node.addHook("Remove", () => resizeObserver.disconnect());
        },
      } as DomphyElement,
    ],
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    } as StyleObject,
  } as DomphyElement;

  return {
    div: [
      gridSvg,
      {
        div: [
          { h2: "Animated Grid Pattern", $: [heading()] } as DomphyElement,
          {
            p: "A faint line grid coming alive with staggered pulsing cells.",
            $: [paragraph()],
          } as DomphyElement,
        ],
        style: { position: "relative", zIndex: 1 },
      } as DomphyElement,
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

export { animatedGridPattern };
