// Aceternity UI "Vortex" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// full-canvas swirling particle field — hundreds of small glowing dots
// flowing in smooth noise-driven currents — used as an atmospheric backdrop
// behind centered CTA text/buttons.
//
// Canvas 2D `requestAnimationFrame` loop, the same shape this package's
// `particles.ts`/`flickeringGrid.ts` already use. What's specific to a
// "vortex" (curling, coherent flow rather than independent random drift) is
// how each particle's direction is chosen: every frame, a particle's angle
// comes from sampling a smooth 2D noise field at its own position (plus a
// slowly-advancing time offset baked into the x-coordinate sampled), so
// neighboring particles — which sample nearby noise-field coordinates — drift
// in similar directions and the whole field reads as coherent swirling
// currents, not independent random walks. There is no `simplex-noise`
// dependency installed in this package (only `cobe`/`canvas-confetti`/
// `rough-notation` are) — see `createNoiseField()` below for a small
// self-contained classic gradient-noise (Perlin-style) implementation used
// instead, which produces the same "smooth, continuous, coherent" field
// this effect needs without adding a new dependency.
//
// The canvas is never fully cleared between frames — each frame paints a
// low-alpha rectangle over the previous frame first, which very slightly
// dims everything already drawn rather than erasing it, leaving soft motion
// streaks behind each particle (the classic "trail" trick for this kind of
// flow-field effect).

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { button, heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColorToken, themeColor, themeSpacing } from "@domphy/theme";

export interface VortexProps {
  /** Number of particles. Defaults to `700`. */
  particleCount?: number;
  /** Base hue, in degrees (0–360). Defaults to `220` (blue). */
  baseHue?: number;
  /** Total hue variation spread across particles, in degrees. Defaults to `100`. */
  hueRange?: number;
  /** Theme color family for the container surface (and the canvas's trailing-fade tint). Defaults to `"neutral"` (near-black). */
  backgroundColor?: ThemeColor;
  /** Minimum per-particle speed, in canvas px/frame. Defaults to `0`. */
  baseSpeed?: number;
  /** Extra randomized speed added on top of `baseSpeed`. Defaults to `1.5`. */
  rangeSpeed?: number;
  /** Minimum particle radius, in canvas px. Defaults to `1`. */
  baseRadius?: number;
  /** Extra randomized radius added on top of `baseRadius`. Defaults to `2`. */
  rangeRadius?: number;
  /** Vertical spawn spread around the container's vertical center, in canvas px. Defaults to `100`. */
  rangeY?: number;
  /** Foreground content centered on top of the particle field. Defaults to a small demo heading/subtext/CTA. */
  children?: DomphyElement | DomphyElement[];
  style?: StyleObject;
}

interface VortexParticle {
  x: number;
  y: number;
  speed: number;
  radius: number;
  hue: number;
  life: number;
}

/**
 * A small, self-contained classic 2D gradient-noise (Perlin-style)
 * generator: a permutation table shuffled by a seeded linear-congruential
 * generator (deterministic per instance, not `Math.random`-order-dependent),
 * bilinear-interpolated with a smootherstep easing curve between lattice
 * gradients. Not `simplex-noise` (not installed in this package) — a
 * from-scratch implementation of the standard public-domain Perlin
 * algorithm, which produces the same "smooth, continuous" field this effect
 * needs to drive coherent-looking particle motion.
 */
function createNoiseField(seed: number): (x: number, y: number) => number {
  const permutation = new Uint8Array(256);
  for (let index = 0; index < 256; index += 1) permutation[index] = index;

  let randomState = (seed >>> 0) || 1;
  const nextRandom = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  for (let index = 255; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    const temp = permutation[index];
    permutation[index] = permutation[swapIndex];
    permutation[swapIndex] = temp;
  }
  const table = new Uint8Array(512);
  for (let index = 0; index < 512; index += 1) table[index] = permutation[index & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const gradient = (hash: number, x: number, y: number) => {
    const h = hash & 7;
    const gradX = h < 4 ? 1 : -1;
    const gradY = h % 4 < 2 ? 1 : -1;
    return gradX * x + gradY * y;
  };

  return function noise2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const cornerAA = table[table[xi] + yi];
    const cornerAB = table[table[xi] + yi + 1];
    const cornerBA = table[table[xi + 1] + yi];
    const cornerBB = table[table[xi + 1] + yi + 1];
    const lerpX1 = lerp(gradient(cornerAA, xf, yf), gradient(cornerBA, xf - 1, yf), u);
    const lerpX2 = lerp(gradient(cornerAB, xf, yf - 1), gradient(cornerBB, xf - 1, yf - 1), u);
    return lerp(lerpX1, lerpX2, v);
  };
}

function defaultVortexContent(): DomphyElement[] {
  return [
    { h1: "Ambient CTA", $: [heading({ color: "neutral" })] } as DomphyElement,
    {
      p: "A slow-moving field of swirling particles behind your call to action.",
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement,
    {
      button: "Get started",
      type: "button",
      $: [button({ color: "primary" })],
      style: { marginTop: themeSpacing(4) },
    } as DomphyElement,
  ];
}

/**
 * A full-canvas swirling particle field — hundreds of small glowing dots
 * flowing in smooth noise-driven currents — for use as an atmospheric
 * backdrop behind centered CTA content. Purely ambient, non-interactive.
 * Call with no arguments for a working demo — a dark panel with 700
 * drifting blue particles behind a heading, subtext, and CTA button.
 */
function vortex(props: VortexProps = {}): DomphyElement<"div"> {
  const particleCount = Math.max(1, Math.round(props.particleCount ?? 700));
  const baseHue = props.baseHue ?? 220;
  const hueRange = props.hueRange ?? 100;
  const backgroundColor = props.backgroundColor ?? "neutral";
  const baseSpeed = props.baseSpeed ?? 0;
  const rangeSpeed = props.rangeSpeed ?? 1.5;
  const baseRadius = props.baseRadius ?? 1;
  const rangeRadius = props.rangeRadius ?? 2;
  const rangeY = props.rangeY ?? 100;

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultVortexContent();

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors particles.ts).
  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative canvas with no text of its own — fill colors are resolved
    // imperatively below (canvas 2D has no themeColor() var() concept).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    },
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
      let particleList: VortexParticle[] = [];
      let animationFrameId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let elapsedTime = 0;

      const noise2D = createNoiseField(Math.floor(Math.random() * 4294967296));

      // Trailing-fade tint resolved once from the theme, at mount — canvas 2D
      // has no notion of the `var(--…)` reference `themeColor()` returns.
      const trailFillColor = (() => {
        try {
          return themeColorToken(node, "shift-17", backgroundColor);
        } catch {
          return "#000000";
        }
      })();

      function spawnParticle(): VortexParticle {
        return {
          x: Math.random() * canvasWidth,
          y: canvasHeight / 2 + (Math.random() - 0.5) * rangeY * 2,
          speed: baseSpeed + Math.random() * rangeSpeed,
          radius: baseRadius + Math.random() * rangeRadius,
          hue: baseHue + (Math.random() - 0.5) * hueRange,
          life: Math.random() * 200,
        };
      }

      function resizeCanvas(): void {
        const rect = containerElement!.getBoundingClientRect();
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas!.width = Math.max(1, Math.floor(canvasWidth * devicePixelRatio));
        canvas!.height = Math.max(1, Math.floor(canvasHeight * devicePixelRatio));
        context!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      }

      function generateParticles(): void {
        particleList = Array.from({ length: particleCount }, () => spawnParticle());
      }

      function tick(): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the framework's
        // removal lifecycle) never fire the "Remove" hook below, and unlike
        // `parallaxScroll`/`glowingEffect` this loop has no other convergence
        // condition — it reschedules unconditionally every frame. Bailing here
        // once the canvas is detached prevents it from leaking forever.
        if (!canvas!.isConnected) return;
        elapsedTime += 0.0015;

        // Dim (not clear) the previous frame — leaves soft motion streaks
        // behind each moving particle instead of a hard-edged trail.
        context!.fillStyle = trailFillColor;
        context!.globalAlpha = 0.08;
        context!.fillRect(0, 0, canvasWidth, canvasHeight);
        context!.globalAlpha = 1;

        for (const particle of particleList) {
          const noiseValue = noise2D(
            particle.x * 0.006 + elapsedTime,
            particle.y * 0.006,
          );
          const angle = noiseValue * Math.PI * 4;
          particle.x += Math.cos(angle) * (particle.speed + 0.15);
          particle.y += Math.sin(angle) * (particle.speed + 0.15);
          particle.life -= 1;

          const offCanvas =
            particle.x < -10 || particle.x > canvasWidth + 10 ||
            particle.y < -10 || particle.y > canvasHeight + 10;
          if (offCanvas || particle.life <= 0) {
            Object.assign(particle, spawnParticle());
            continue;
          }

          context!.beginPath();
          context!.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context!.fillStyle = `hsla(${particle.hue}, 85%, 65%, 0.8)`;
          context!.fill();
        }

        animationFrameId = window.requestAnimationFrame(tick);
      }

      resizeCanvas();
      generateParticles();
      context.fillStyle = trailFillColor;
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      animationFrameId = window.requestAnimationFrame(tick);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          resizeCanvas();
          generateParticles();
        });
        resizeObserver.observe(containerElement);
      }

      node.addHook("Remove", () => {
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
        resizeObserver?.disconnect();
      });
    },
  } as DomphyElement<"canvas">;

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

export { vortex };
