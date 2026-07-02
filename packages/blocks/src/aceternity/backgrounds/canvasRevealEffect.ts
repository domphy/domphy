// Aceternity UI "Canvas Reveal Effect" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// dense grid of small colored dots rendered on canvas, dim at rest, that
// animates into a shimmering, ripple-like reveal when the container is
// hovered (or driven programmatically), commonly layered behind a card.
//
// The reference implementation is a WebGL fragment shader; this substitutes
// a plain 2D canvas `requestAnimationFrame` loop (the same technique
// `flickeringGrid()` already uses in this package) — visually equivalent for
// a per-cell shimmer, no WebGL context required. Each grid cell's brightness
// each frame is `revealProgress * paletteOpacity * shimmer`, where `shimmer`
// is a `sin()` wave phase-shifted by the cell's distance from the pointer's
// entry point, so the reveal reads as a ripple expanding outward from where
// the cursor entered rather than every cell lighting up in lockstep.
// `revealProgress` itself is a separate value lerped toward `1` on hover-in
// (or when `active` is driven programmatically) and back toward `0` on
// hover-out, using the same rAF-lerp idiom `scrollProgress()` uses for its
// fill bar. An `IntersectionObserver` pauses the whole loop while the
// canvas is scrolled out of view.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import { card, heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColorToken, themeColor, themeSpacing } from "@domphy/theme";

export interface CanvasRevealEffectProps {
  /** Theme color roles cycled across the dot palette. Defaults to `["info"]`
   * (a single cyan-reading accent, matching the reference's default). */
  colors?: ThemeColor[];
  /** Per-dot opacity levels cycled for layered depth. Defaults to a
   * ten-step ramp from dim to full. */
  opacities?: number[];
  /** Animation speed multiplier (shimmer + ripple frequency). Defaults to `0.4`. */
  animationSpeed?: number;
  /** Side length of each square dot, in canvas px. Defaults to `3`. */
  dotSize?: number;
  /** Gap between dots, in canvas px. Defaults to `6`. */
  gridGap?: number;
  /** Toggles the radial-gradient vignette overlay that contains the dot field. Defaults to `true`. */
  showVignette?: boolean;
  /** Programmatic reveal control — when provided, hover no longer drives the
   * reveal and this value (or state) does instead. Omit for hover-driven behavior. */
  active?: ValueOrState<boolean>;
  /** Content rendered above the canvas (typically a card). Defaults to a small demo card. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const DEFAULT_OPACITIES = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1];

/**
 * A canvas-rendered grid of colored dots that shimmers into a ripple-like
 * reveal on hover (or programmatic `active` control), typically layered
 * behind a card. Call with no arguments for a working demo — hover the panel
 * to see the cyan dot grid reveal itself behind a demo card.
 */
function canvasRevealEffect(props: CanvasRevealEffectProps = {}): DomphyElement<"div"> {
  const colors = props.colors && props.colors.length > 0 ? props.colors : (["info"] as ThemeColor[]);
  const opacities = props.opacities && props.opacities.length > 0 ? props.opacities : DEFAULT_OPACITIES;
  const animationSpeed = props.animationSpeed ?? 0.4;
  const dotSize = Math.max(1, props.dotSize ?? 3);
  const gridGap = Math.max(0, props.gridGap ?? 6);
  const showVignette = props.showVignette ?? true;
  const isControlled = props.active !== undefined;
  const activeState = toState(props.active ?? false, "active");

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        {
          div: [
            { h3: "Canvas Reveal Effect", $: [heading()] } as DomphyElement,
            { p: "Hover to reveal the shimmering dot field behind this card.", $: [paragraph({ color: "neutral" })] } as DomphyElement,
          ],
          $: [card({ color: "neutral" })],
        } as DomphyElement,
      ];

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative canvas with no text of its own — fill colors are resolved
    // imperatively below (canvas 2D has no themeColor() var() concept),
    // mirroring flickeringGrid.ts's own exemption.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      const canvas = node.domElement as HTMLCanvasElement | null;
      const containerElement = canvas?.parentElement ?? null;
      if (!canvas || !containerElement || typeof window === "undefined") return;

      const context = canvas.getContext("2d");
      if (!context) return;

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let cssWidth = 0;
      let cssHeight = 0;
      let columns = 0;
      let rows = 0;
      let cellSeeds = new Float32Array(0);
      let cellColorIndex = new Uint8Array(0);
      let cellOpacityIndex = new Uint8Array(0);
      let currentReveal = 0;
      let targetReveal = 0;
      let animationFrameId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let intersectionObserver: IntersectionObserver | null = null;
      let entryColumn = 0;
      let entryRow = 0;

      const fillColors = colors.map((color) => {
        try {
          return themeColorToken(node, "shift-10", color);
        } catch {
          return "#22d3ee";
        }
      });

      function resizeCanvas(): void {
        const rect = containerElement!.getBoundingClientRect();
        cssWidth = rect.width || 320;
        cssHeight = rect.height || 200;
        canvas!.width = Math.max(1, Math.floor(cssWidth * devicePixelRatio));
        canvas!.height = Math.max(1, Math.floor(cssHeight * devicePixelRatio));
        context!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        const cellSpan = dotSize + gridGap;
        columns = Math.max(1, Math.floor(cssWidth / cellSpan));
        rows = Math.max(1, Math.floor(cssHeight / cellSpan));
        const cellCount = Math.max(1, columns * rows);
        cellSeeds = new Float32Array(cellCount);
        cellColorIndex = new Uint8Array(cellCount);
        cellOpacityIndex = new Uint8Array(cellCount);
        for (let index = 0; index < cellCount; index += 1) {
          cellSeeds[index] = Math.random() * Math.PI * 2;
          cellColorIndex[index] = Math.floor(Math.random() * fillColors.length);
          cellOpacityIndex[index] = Math.floor(Math.random() * opacities.length);
        }
        entryColumn = Math.floor(columns / 2);
        entryRow = Math.floor(rows / 2);
      }

      function drawGrid(timeSeconds: number): void {
        context!.clearRect(0, 0, cssWidth, cssHeight);
        if (currentReveal <= 0.001) return;
        const cellSpan = dotSize + gridGap;
        const maxDistance = Math.hypot(columns, rows) || 1;

        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const index = row * columns + column;
            const distance = Math.hypot(column - entryColumn, row - entryRow) / maxDistance;
            const wave = Math.sin(timeSeconds * animationSpeed * 4 - distance * 8 + cellSeeds[index]) * 0.5 + 0.5;
            const baseOpacity = opacities[cellOpacityIndex[index]] ?? 0.5;
            const alpha = currentReveal * baseOpacity * (0.35 + wave * 0.65);
            if (alpha <= 0.01) continue;
            context!.globalAlpha = Math.min(1, alpha);
            context!.fillStyle = fillColors[cellColorIndex[index]] ?? fillColors[0];
            context!.fillRect(column * cellSpan, row * cellSpan, dotSize, dotSize);
          }
        }
        context!.globalAlpha = 1;
      }

      function tick(timeMs: number): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the framework's
        // removal lifecycle) never fire the "Remove" hook below, and this loop
        // has no other convergence condition — it reschedules unconditionally
        // every frame. Bailing here once the canvas is detached prevents it
        // from leaking forever.
        if (!canvas!.isConnected) return;
        const timeSeconds = timeMs / 1000;
        currentReveal += (targetReveal - currentReveal) * 0.08;
        if (Math.abs(targetReveal - currentReveal) < 0.002) currentReveal = targetReveal;
        drawGrid(timeSeconds);
        animationFrameId = window.requestAnimationFrame(tick);
      }

      function startLoop(): void {
        if (animationFrameId !== null) return;
        animationFrameId = window.requestAnimationFrame(tick);
      }
      function stopLoop(): void {
        if (animationFrameId === null) return;
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      function setEntryPoint(clientX: number, clientY: number): void {
        const rect = containerElement!.getBoundingClientRect();
        const cellSpan = dotSize + gridGap;
        entryColumn = Math.max(0, Math.min(columns - 1, Math.floor((clientX - rect.left) / cellSpan)));
        entryRow = Math.max(0, Math.min(rows - 1, Math.floor((clientY - rect.top) / cellSpan)));
      }

      resizeCanvas();

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => resizeCanvas());
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
        startLoop();
      }

      let removeHoverListeners: (() => void) | null = null;
      if (!isControlled) {
        const onPointerEnter = (event: PointerEvent) => {
          setEntryPoint(event.clientX, event.clientY);
          targetReveal = 1;
        };
        const onPointerLeave = () => {
          targetReveal = 0;
        };
        containerElement.addEventListener("pointerenter", onPointerEnter);
        containerElement.addEventListener("pointerleave", onPointerLeave);
        removeHoverListeners = () => {
          containerElement!.removeEventListener("pointerenter", onPointerEnter);
          containerElement!.removeEventListener("pointerleave", onPointerLeave);
        };
      }

      targetReveal = activeState.get() ? 1 : 0;
      const releaseActiveListener = activeState.addListener((isActive: boolean) => {
        targetReveal = isActive ? 1 : 0;
      });

      node.addHook("Remove", () => {
        stopLoop();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        removeHoverListeners?.();
        releaseActiveListener();
      });
    },
  } as DomphyElement<"canvas">;

  const vignetteOverlay: DomphyElement = {
    div: null,
    ariaHidden: "true",
    // Decorative vignette overlay with no text of its own.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: (listener) => `radial-gradient(ellipse at center, transparent 40%, ${themeColor(listener, "inherit")} 100%)`,
    } as StyleObject,
  } as DomphyElement;

  return {
    div: [canvasElement, ...(showVignette ? [vignetteOverlay] : []), { div: contentChildren, style: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" } as StyleObject } as DomphyElement],
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

export { canvasRevealEffect };
