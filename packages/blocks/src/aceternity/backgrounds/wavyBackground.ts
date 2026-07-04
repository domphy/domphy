// Aceternity UI "Wavy Background" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// full-bleed animated backdrop of soft, blurred, colorful waves flowing
// behind page content — a glowing aurora/gradient ribbon.
//
// Canvas 2D `requestAnimationFrame` loop, the same shape this package's
// `vortex.ts` already uses for its own particle field: every frame, several
// overlapping wave strokes (one per configured color) are traced across the
// canvas width and stroked with a low `globalAlpha`, with a heavy CSS
// `filter: blur(...)` applied over the whole canvas element so the
// individually-drawn strokes melt into one glowing multicolor ribbon instead
// of showing as separate thin lines — the "many strokes + one shared blur"
// technique already used by this package's `backgroundGradient.ts` for its
// own blob layers, applied here to strokes instead of filled shapes.
//
// Each wave's vertical offset comes from summing two sine terms at different
// frequency/phase (a cheap, dependency-free stand-in for true simplex/Perlin
// noise — `vortex.ts` implements a full gradient-noise field for its own
// coherent particle drift, but a single flowing ribbon only needs a
// less-uniform curve, not a full 2D field) so the curve reads as organic
// rather than a single perfect sine, per the spec's own description.
//
// The upstream spec's `colors` prop is literal hex strings — Domphy's doctor
// rules forbid raw hex/rgb colors on style props, so (matching this
// package's `backgroundBeams.ts`/`vortex.ts`) the palette is exposed as
// `ThemeColor` roles instead, resolved to real hex once via
// `themeColorToken()` for the canvas 2D context (which has no `var()`
// concept), defaulting to `["info", "primary", "secondary", "highlight"]` —
// this theme's closest four built-in families to the documented
// cyan/indigo/purple/fuchsia gradient.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeColorToken, themeSpacing } from "@domphy/theme";
import { demoContentScrimStyle } from "../../shared/demoContentScrim.js";

export type WavyBackgroundSpeed = "slow" | "fast";

export interface WavyBackgroundProps {
  /** Theme color families cycled across the wave layers. Defaults to `["info", "primary", "secondary", "highlight"]`. */
  colors?: ThemeColor[];
  /** Controls wave frequency/tightness — smaller is tighter. Defaults to `50`. */
  waveWidth?: number;
  /** Theme color family for the base fill behind the waves. Defaults to `"neutral"` (near-black). */
  backgroundColor?: ThemeColor;
  /** Blur radius applied over the canvas, in px. Defaults to `10`. */
  blur?: number;
  /** Overall animation pace. Defaults to `"slow"`. */
  speed?: WavyBackgroundSpeed;
  /** Per-stroke opacity, `0-1`. Defaults to `0.5`. */
  waveOpacity?: number;
  /** Content layered above the waves. Defaults to a small demo heading/subtext. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the content wrapper. */
  contentStyle?: StyleObject;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

function defaultWavyContent(): DomphyElement[] {
  return [
    {
      div: [
        { h1: "Wavy Background", $: [heading({ color: "neutral" })] } as DomphyElement,
        {
          p: "A slow, glowing ribbon of color flowing behind your content.",
          $: [paragraph({ color: "neutral" })],
        } as DomphyElement,
      ],
      style: demoContentScrimStyle(),
    } as DomphyElement,
  ];
}

/**
 * A full-bleed animated backdrop of soft, blurred, colorful waves flowing
 * behind foreground content — an ambient aurora/gradient-ribbon effect.
 * Purely ambient, non-interactive. Call with no arguments for a working demo
 * — a dark panel with a slow four-color glowing ribbon behind a heading.
 */
function wavyBackground(props: WavyBackgroundProps = {}): DomphyElement<"div"> {
  const colors = props.colors && props.colors.length > 0 ? props.colors : (["info", "primary", "secondary", "highlight"] as ThemeColor[]);
  const waveWidth = Math.max(1, props.waveWidth ?? 50);
  const backgroundColor = props.backgroundColor ?? "neutral";
  const blur = Math.max(0, props.blur ?? 10);
  const speed = props.speed ?? "slow";
  const waveOpacity = Math.min(1, Math.max(0, props.waveOpacity ?? 0.5));

  const contentChildren = props.children ? (Array.isArray(props.children) ? props.children : [props.children]) : defaultWavyContent();

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative canvas with no text of its own — fill/stroke colors are
    // resolved imperatively below (canvas 2D has no themeColor() var() concept).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      filter: `blur(${blur}px)`,
      pointerEvents: "none",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      const canvas = node.domElement as HTMLCanvasElement | null;
      const containerElement = canvas?.parentElement ?? null;
      if (!canvas || !containerElement || typeof window === "undefined") return;

      // Headless/test runtimes without a real 2D canvas backend (e.g. jsdom
      // without the optional `canvas` npm package) resolve `getContext` to
      // `null` rather than throwing — bail out before starting the loop.
      const context = canvas.getContext("2d");
      if (!context) return;

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let canvasWidth = 0;
      let canvasHeight = 0;
      let animationFrameId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let intersectionObserver: IntersectionObserver | null = null;
      let elapsedTime = 0;
      const timeStep = speed === "fast" ? 0.018 : 0.006;

      const backgroundToken = (() => {
        try {
          return themeColorToken(node, "shift-17", backgroundColor);
        } catch {
          return "#000000";
        }
      })();
      const strokeTokens = colors.map((color) => {
        try {
          return themeColorToken(node, "shift-9", color);
        } catch {
          return "#38bdf8";
        }
      });

      function resizeCanvas(): void {
        const rect = containerElement!.getBoundingClientRect();
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas!.width = Math.max(1, Math.floor(canvasWidth * devicePixelRatio));
        canvas!.height = Math.max(1, Math.floor(canvasHeight * devicePixelRatio));
        context!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      }

      function waveOffset(x: number, layerIndex: number, amplitude: number, frequency: number): number {
        const phase = elapsedTime + layerIndex * 1.7;
        const primary = Math.sin(x * frequency + phase);
        const secondary = Math.sin(x * frequency * 0.47 + phase * 1.3 + layerIndex);
        return primary * amplitude + secondary * amplitude * 0.4;
      }

      function tick(): void {
        elapsedTime += timeStep;

        context!.clearRect(0, 0, canvasWidth, canvasHeight);
        context!.fillStyle = backgroundToken;
        context!.fillRect(0, 0, canvasWidth, canvasHeight);

        const centerY = canvasHeight * 0.58;
        const amplitude = canvasHeight * 0.12;
        const frequency = (Math.PI * 2) / (waveWidth * 20);
        const thickness = Math.max(2, canvasHeight * 0.045);
        const step = Math.max(2, Math.floor(canvasWidth / 220));

        for (let layerIndex = 0; layerIndex < strokeTokens.length; layerIndex += 1) {
          context!.beginPath();
          for (let x = 0; x <= canvasWidth; x += step) {
            const y = centerY + waveOffset(x, layerIndex, amplitude, frequency);
            if (x === 0) context!.moveTo(x, y);
            else context!.lineTo(x, y);
          }
          context!.lineWidth = thickness;
          context!.lineCap = "round";
          context!.lineJoin = "round";
          context!.strokeStyle = strokeTokens[layerIndex];
          context!.globalAlpha = waveOpacity;
          context!.stroke();
        }
        context!.globalAlpha = 1;

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
      context.fillStyle = backgroundToken;
      context.fillRect(0, 0, canvasWidth, canvasHeight);

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

      node.addHook("Remove", () => {
        stopLoop();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
      });
    },
  } as unknown as DomphyElement<"canvas">;

  return {
    div: [
      canvasElement,
      {
        div: contentChildren,
        style: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
          ...(props.contentStyle ?? {}),
        } as StyleObject,
      } as DomphyElement,
    ],
    dataTone: "shift-17",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      minHeight: themeSpacing(120),
      padding: themeSpacing(10),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { wavyBackground };
