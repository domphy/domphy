// Aceternity UI "Dotted Glow Background" — clean-room reimplementation from
// the public behavior/visual spec only (no upstream source viewed or
// copied). A full-area grid of small dots where each dot continuously pulses
// its glow brightness at its own random pace, reading as a quiet, organic
// twinkling backdrop rather than a bold pattern.
//
// Canvas particle-loop technique, the same shape this package's
// `flickeringGrid` uses for its own twinkling grid: a flat array holds one
// `{ phase, speed }` pair per grid cell (assigned once, on layout), and every
// `requestAnimationFrame` tick recomputes each dot's alpha from
// `sin(elapsedSeconds * speed + phase)` — a smooth, continuous oscillation,
// not a random reroll — so dots glow up and down rather than flicker/twinkle
// on/off. Every dot gets its own randomized `speed` within the configured
// range, so they drift in and out of phase with no visible synchronized
// wave. The glow halo is drawn via canvas `shadowBlur`/`shadowColor` rather
// than a second, larger transparent circle. An `IntersectionObserver` pauses
// the loop while scrolled out of view and a `ResizeObserver` recomputes the
// grid on resize, matching `flickeringGrid`'s own lifecycle. The optional
// radial vignette is a CSS `mask-image` on the canvas itself (no extra
// canvas draw pass needed) — the same masking idiom this package's `ripple`
// uses for its own edge fade.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColorToken, themeColor, themeSpacing } from "@domphy/theme";

export interface DottedGlowBackgroundProps {
  /** Grid gap between dots, in canvas px. Defaults to `24`. */
  spacing?: number;
  /** Base dot radius, in canvas px. Defaults to `1.5`. */
  dotRadius?: number;
  /** Theme color family for the dot fill. Defaults to `"neutral"`. */
  dotColor?: ThemeColor;
  /** Theme color family for the glow halo. Defaults to `"primary"`. */
  glowColor?: ThemeColor;
  /** Overall layer opacity multiplier, 0–1. Defaults to `0.7`. */
  layerOpacity?: number;
  /** Radially fades dots out near the container's edges/corners instead of a hard cutoff. Defaults to `true`. */
  vignette?: boolean;
  /** Minimum per-dot pulse angular speed, in rad/s. Defaults to `0.4`. */
  minPulseSpeed?: number;
  /** Maximum per-dot pulse angular speed, in rad/s. Defaults to `1.3`. */
  maxPulseSpeed?: number;
  /** Global multiplier applied on top of every dot's own randomized speed. Defaults to `1`. */
  speedMultiplier?: number;
  /** Fixed canvas width, in px. Omit to fill the parent container's measured width. */
  width?: number;
  /** Fixed canvas height, in px. Omit to fill the parent container's measured height. */
  height?: number;
  /** Foreground content layered above the dot grid. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

interface GlowDot {
  x: number;
  y: number;
  phase: number;
  speed: number;
}

const MIN_ALPHA = 0.12;
const MAX_ALPHA = 0.9;

function computeDotGrid(containerWidth: number, containerHeight: number, spacing: number): GlowDot[] {
  const columns = Math.max(1, Math.ceil(containerWidth / spacing) + 1);
  const rows = Math.max(1, Math.ceil(containerHeight / spacing) + 1);
  const dots: GlowDot[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      dots.push({
        x: column * spacing,
        y: row * spacing,
        phase: Math.random() * Math.PI * 2,
        speed: 0, // assigned by the caller once min/max/multiplier are known
      });
    }
  }
  return dots;
}

/**
 * A full-area grid of small dots, each continuously pulsing its own glow
 * brightness at its own randomized pace — an ambient, organic twinkling
 * backdrop. Call with no arguments for a working demo — a dark panel with a
 * quietly shimmering dot grid behind a heading.
 */
function dottedGlowBackground(props: DottedGlowBackgroundProps = {}): DomphyElement<"div"> {
  const spacing = Math.max(4, props.spacing ?? 24);
  const dotRadius = Math.max(0.5, props.dotRadius ?? 1.5);
  const dotColor = props.dotColor ?? "neutral";
  const glowColor = props.glowColor ?? "primary";
  const layerOpacity = props.layerOpacity ?? 0.7;
  const vignette = props.vignette ?? true;
  const minPulseSpeed = Math.max(0.05, props.minPulseSpeed ?? 0.4);
  const maxPulseSpeed = Math.max(minPulseSpeed, props.maxPulseSpeed ?? 1.3);
  const speedMultiplier = props.speedMultiplier ?? 1;
  const fixedWidth = props.width;
  const fixedHeight = props.height;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Dotted Glow Background", $: [heading()] } as DomphyElement,
        {
          p: "Every dot pulses its own glow on an independent, randomized cadence.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors flickeringGrid.ts).
  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative canvas with no text of its own — fill/glow colors are
    // resolved imperatively below (canvas 2D has no themeColor() var() concept).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: fixedWidth ? `${fixedWidth}px` : "100%",
      height: fixedHeight ? `${fixedHeight}px` : "100%",
      pointerEvents: "none",
      maskImage: vignette
        ? "radial-gradient(ellipse at center, black 45%, transparent 100%)"
        : undefined,
      WebkitMaskImage: vignette
        ? "radial-gradient(ellipse at center, black 45%, transparent 100%)"
        : undefined,
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
      let dots: GlowDot[] = [];
      let animationFrameId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let intersectionObserver: IntersectionObserver | null = null;
      const startTime = performance.now();

      const dotFillColor = (() => {
        try {
          return themeColorToken(node, "shift-9", dotColor);
        } catch {
          return "#aaaaaa";
        }
      })();
      const glowShadowColor = (() => {
        try {
          return themeColorToken(node, "shift-9", glowColor);
        } catch {
          return "#7aa2ff";
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

        dots = computeDotGrid(cssWidth, cssHeight, spacing).map((dot) => ({
          ...dot,
          speed: (minPulseSpeed + Math.random() * (maxPulseSpeed - minPulseSpeed)) * speedMultiplier,
        }));
      }

      function drawFrame(elapsedSeconds: number): void {
        context!.clearRect(0, 0, cssWidth, cssHeight);
        for (const dot of dots) {
          const oscillation = (Math.sin(elapsedSeconds * dot.speed + dot.phase) + 1) / 2;
          const alpha = (MIN_ALPHA + oscillation * (MAX_ALPHA - MIN_ALPHA)) * layerOpacity;
          context!.globalAlpha = Math.max(0, Math.min(1, alpha));
          context!.shadowBlur = dotRadius * 4;
          context!.shadowColor = glowShadowColor;
          context!.fillStyle = dotFillColor;
          context!.beginPath();
          context!.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
          context!.fill();
        }
        context!.globalAlpha = 1;
        context!.shadowBlur = 0;
      }

      function tick(time: number): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the framework's
        // removal lifecycle) never fire the "Remove" hook below, and this loop
        // has no other convergence condition — it reschedules unconditionally
        // every frame. Bailing here once the canvas is detached prevents it
        // from leaking forever.
        if (!canvas!.isConnected) return;
        drawFrame((time - startTime) / 1000);
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

      resizeCanvas();
      drawFrame(0);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          resizeCanvas();
          drawFrame((performance.now() - startTime) / 1000);
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
    dataTone: "shift-16",
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

export { dottedGlowBackground };
