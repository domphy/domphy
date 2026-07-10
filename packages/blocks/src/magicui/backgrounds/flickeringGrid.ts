// Magic UI "Flickering Grid" — clean-room reimplementation.
//
// A canvas-rendered grid of small squares whose individual opacities flicker
// randomly and continuously, producing a TV-static / circuit-board noise
// texture — typically layered behind hero content as ambient decoration.
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.
//
// Canvas 2D "particle grid" loop: a flat typed array holds one opacity value
// per grid cell. Each `requestAnimationFrame` tick computes the elapsed time
// since the previous frame, then for every cell rolls `Math.random() <
// flickerChance * deltaSeconds` — a hit re-randomizes that cell's opacity
// between `0` and `maxOpacity`; a miss leaves it untouched. Because only a
// small fraction of cells reroll per frame, the grid twinkles organically
// rather than pulsing in unison. An `IntersectionObserver` pauses the loop
// entirely while the canvas is scrolled out of view, and a `ResizeObserver`
// recomputes the column/row count (and reallocates the opacity array) when
// the container is resized. The canvas backing store is scaled by
// `devicePixelRatio` (capped at 2) for crisp edges on high-DPI screens; the
// fill color is resolved once via `themeColorToken` (a concrete hex string —
// canvas 2D has no notion of the `var(--…)` references `themeColor()`
// returns) and does not re-resolve on a later runtime theme swap. See this
// component's `fidelityNotes` for that tradeoff.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeColorToken,
  themeSpacing,
} from "@domphy/theme";
import { heading, paragraph } from "@domphy/ui";

export interface FlickeringGridProps {
  /** Side length of each square, in canvas px. Defaults to `4`. */
  squareSize?: number;
  /** Gap between squares, in canvas px. Defaults to `6`. */
  gridGap?: number;
  /** Probability factor driving how often a cell rerolls its opacity (higher = more frequent flicker). Defaults to `0.3`. */
  flickerChance?: number;
  /** Theme color family for the squares. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Fixed canvas width, in px. Omit to fill the parent container's measured width. */
  width?: number;
  /** Fixed canvas height, in px. Omit to fill the parent container's measured height. */
  height?: number;
  /** Ceiling for each cell's randomized opacity. Defaults to `0.3`. */
  maxOpacity?: number;
  /** Foreground content layered above the grid. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

function computeGridDimensions(
  containerWidth: number,
  containerHeight: number,
  squareSize: number,
  gridGap: number,
): { columns: number; rows: number } {
  const cellSpan = squareSize + gridGap;
  return {
    columns: Math.max(1, Math.ceil(containerWidth / cellSpan)),
    rows: Math.max(1, Math.ceil(containerHeight / cellSpan)),
  };
}

/**
 * A canvas-rendered grid of squares that flicker between random opacities,
 * gated to only animate while scrolled into view. Call with no arguments for
 * a working demo — a dark panel with a twinkling grid behind a heading.
 */
function flickeringGrid(props: FlickeringGridProps = {}): DomphyElement<"div"> {
  const squareSize = Math.max(1, props.squareSize ?? 4);
  const gridGap = Math.max(0, props.gridGap ?? 6);
  const flickerChance = props.flickerChance ?? 0.3;
  const color = props.color ?? "neutral";
  const fixedWidth = props.width;
  const fixedHeight = props.height;
  const maxOpacity = props.maxOpacity ?? 0.3;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Flickering Grid", $: [heading()] } as DomphyElement,
        {
          p: "A canvas grid of squares twinkling between random opacities.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors particles.ts).
  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative canvas with no text of its own — fill color is resolved
    // imperatively below (canvas 2D has no themeColor() var() concept).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: fixedWidth ? `${fixedWidth}px` : "100%",
      height: fixedHeight ? `${fixedHeight}px` : "100%",
      pointerEvents: "none",
    },
    _onMount: (node: ElementNode) => {
      const canvas = node.domElement as HTMLCanvasElement | null;
      const containerElement = canvas?.parentElement ?? null;
      if (!canvas || !containerElement || typeof window === "undefined") return;

      // Headless/test runtimes without a real 2D canvas backend resolve
      // `getContext` to `null` rather than throwing — bail before starting.
      const context = canvas.getContext("2d");
      if (!context) return;

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let cssWidth = 0;
      let cssHeight = 0;
      let columns = 0;
      let rows = 0;
      let opacities = new Float32Array(0);
      let lastFrameTime = 0;
      let animationFrameId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let intersectionObserver: IntersectionObserver | null = null;

      // shift-6 (a dim, muted step) so the flicker reads as a faint texture
      // against the container's own dark shift-15 surface — the per-cell
      // random alpha (capped at `maxOpacity`) on top does the rest.
      const fillColor = (() => {
        try {
          return themeColorToken(node, "shift-6", color);
        } catch {
          return "#888888";
        }
      })();

      function resizeCanvas(): void {
        const rect = containerElement!.getBoundingClientRect();
        cssWidth = fixedWidth ?? rect.width;
        cssHeight = fixedHeight ?? rect.height;
        canvas!.width = Math.max(1, Math.floor(cssWidth * devicePixelRatio));
        canvas!.height = Math.max(1, Math.floor(cssHeight * devicePixelRatio));
        // `setTransform` (not `scale`) so repeated resizes never compound the
        // device-pixel-ratio scale factor onto itself.
        context!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        const dimensions = computeGridDimensions(
          cssWidth,
          cssHeight,
          squareSize,
          gridGap,
        );
        columns = dimensions.columns;
        rows = dimensions.rows;
        const nextOpacities = new Float32Array(Math.max(1, columns * rows));
        for (let index = 0; index < nextOpacities.length; index += 1) {
          nextOpacities[index] = Math.random() * maxOpacity;
        }
        opacities = nextOpacities;
      }

      function drawGrid(): void {
        context!.clearRect(0, 0, cssWidth, cssHeight);
        context!.fillStyle = fillColor;
        const cellSpan = squareSize + gridGap;
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const index = row * columns + column;
            context!.globalAlpha = opacities[index] ?? 0;
            context!.fillRect(
              column * cellSpan,
              row * cellSpan,
              squareSize,
              squareSize,
            );
          }
        }
        context!.globalAlpha = 1;
      }

      function tick(time: number): void {
        // Belt-and-suspenders: bail without rescheduling once the canvas is
        // no longer in the document, even if the IntersectionObserver above
        // never fires (e.g. unsupported in a test runtime, or the framework's
        // own "Remove" hook didn't run because of a raw DOM wipe).
        if (!canvas!.isConnected) {
          stopLoop();
          return;
        }
        const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 0.2);
        lastFrameTime = time;
        for (let index = 0; index < opacities.length; index += 1) {
          if (Math.random() < flickerChance * deltaSeconds) {
            opacities[index] = Math.random() * maxOpacity;
          }
        }
        drawGrid();
        animationFrameId = window.requestAnimationFrame(tick);
      }

      function startLoop(): void {
        if (animationFrameId !== null) return;
        lastFrameTime = performance.now();
        animationFrameId = window.requestAnimationFrame(tick);
      }
      function stopLoop(): void {
        if (animationFrameId === null) return;
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      resizeCanvas();
      drawGrid();

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          resizeCanvas();
          drawGrid();
        });
        resizeObserver.observe(containerElement);
      }

      if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) startLoop();
            else stopLoop();
          }
        });
        intersectionObserver.observe(containerElement);
      } else {
        // No IntersectionObserver support — fail open and animate always.
        startLoop();
      }

      node.addHook("Remove", () => {
        stopLoop();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
      });
    },
  } as DomphyElement<"canvas">;

  return {
    div: [
      canvasElement,
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

export { flickeringGrid };
