// Magic UI "Particles" — clean-room reimplementation.
//
// An ambient animated dot-field background rendered on canvas: many tiny
// particles drift slowly and scatter away from the mouse cursor, typically
// layered behind hero text for depth and subtle motion. Implemented purely
// from the block's public functional/visual spec — no upstream Magic UI
// source was viewed or copied.
//
// Canvas particle simulation via `requestAnimationFrame`: particles are
// generated on mount (and regenerated on resize/refresh) with random
// position/size/drift, then each frame fades in/out near the container
// edges, drifts by its own ambient velocity, wraps at the container edges,
// and eases toward an offset proportional to the mouse's position relative
// to the container's center (scaled per-particle by its own `magnetism` and
// by `staticity`, approached at a rate scaled by `ease`) -- so the whole
// field subtly parallaxes toward/away from the cursor rather than each
// particle individually fleeing it. Mouse position is tracked via
// pointermove on the container (the canvas itself has `pointerEvents: none`
// so it never intercepts clicks meant for foreground content) and the canvas
// backing store is scaled for `devicePixelRatio` for crisp rendering.
//
// Canvas fill color is resolved once, at mount, from the current theme via
// `themeColorToken` (which returns a concrete hex string — canvas 2D has no
// concept of CSS custom properties, so `themeColor()`'s `var(--…)` reference
// cannot be used here). It does not re-resolve on a later runtime theme
// swap; see this component's `fidelityNotes`.

import type {
  DomphyElement,
  ElementNode,
  StyleObject,
  ValueOrState,
} from "@domphy/core";
import { toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeColorToken,
  themeSpacing,
} from "@domphy/theme";
import { heading, paragraph } from "@domphy/ui";

export interface ParticlesProps {
  /** Number of particles. Defaults to `100`. */
  quantity?: number;
  /** Theme color family for the particles. Defaults to `"neutral"` (reads bright against a dark surface). */
  color?: ThemeColor;
  /** Base particle radius, in canvas pixels. Defaults to `0.4`. */
  size?: number;
  /** Higher = smoother/slower easing back to rest. Defaults to `50`. */
  ease?: number;
  /** Higher = more resistant to the mouse-repulsion force. Defaults to `50`. */
  staticity?: number;
  /** Ambient horizontal drift velocity. Defaults to `0`. */
  vx?: number;
  /** Ambient vertical drift velocity. Defaults to `0`. */
  vy?: number;
  /** Toggle (any `ValueOrState` value change) to regenerate the particle set. */
  refreshKey?: ValueOrState<unknown>;
  /** Foreground content layered above the particle field. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

interface ParticleInstance {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  driftX: number;
  driftY: number;
  magnetism: number;
}

function hexTokenToRgba(hexToken: string, alpha: number): string {
  const hex = hexToken.replace("#", "");
  const isShort = hex.length === 3;
  const red = parseInt(isShort ? hex[0] + hex[0] : hex.slice(0, 2), 16) || 255;
  const green =
    parseInt(isShort ? hex[1] + hex[1] : hex.slice(2, 4), 16) || 255;
  const blue = parseInt(isShort ? hex[2] + hex[2] : hex.slice(4, 6), 16) || 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createParticle(
  width: number,
  height: number,
  baseSize: number,
  vx: number,
  vy: number,
): ParticleInstance {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    translateX: 0,
    translateY: 0,
    size: Math.floor(Math.random() * 2) + baseSize,
    alpha: 0,
    targetAlpha: Math.round((Math.random() * 0.6 + 0.1) * 10) / 10,
    driftX: (Math.random() - 0.5) * 0.1 + vx,
    driftY: (Math.random() - 0.5) * 0.1 + vy,
    magnetism: 0.1 + Math.random() * 4,
  };
}

/**
 * An ambient animated dot-field background (canvas), where particles drift
 * slowly and scatter away from the mouse cursor. Call with no arguments for a
 * working demo — a dark panel with 100 drifting particles behind a heading.
 */
function particles(props: ParticlesProps = {}): DomphyElement<"div"> {
  const quantity = Math.max(1, Math.round(props.quantity ?? 100));
  const color = props.color ?? "neutral";
  const baseSize = props.size ?? 0.4;
  const ease = Math.max(1, props.ease ?? 50);
  const staticity = Math.max(1, props.staticity ?? 50);
  const vx = props.vx ?? 0;
  const vy = props.vy ?? 0;
  const refreshState = toState(props.refreshKey ?? null, "refreshKey");

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Particles", $: [heading()] } as DomphyElement,
        {
          p: "A quiet field of drifting particles that scatter from the cursor.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors fadeOverlay() in the
  // marquee block).
  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative canvas with no text of its own — exempt from the
    // missing-color contract (there is no reactive themeColor on this element
    // at all; fill color is imperative canvas state, resolved below).
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

      let particleList: ParticleInstance[] = [];
      // Raw devicePixelRatio, no clamp — matches upstream (`const dpr =
      // window.devicePixelRatio`). Clamping to 2 would render a lower-res
      // backing store on >2× displays. `|| 1` guards a 0/undefined ratio so
      // the width/scale math below can't collapse.
      const devicePixelRatio = window.devicePixelRatio || 1;
      let canvasWidth = 0;
      let canvasHeight = 0;
      let mouseX = 0;
      let mouseY = 0;
      let animationFrameId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;

      // shift-11 (not a small shift-1) so particles read as a bright,
      // clearly visible dot field against the container's own dark surface —
      // a small shift only nudges a couple of ramp steps toward the opposite
      // edge and would barely be distinguishable from the background.
      const fillColor = (() => {
        try {
          return themeColorToken(node, "shift-11", color);
        } catch {
          return "#ffffff";
        }
      })();

      function resizeCanvas(): void {
        const rect = containerElement!.getBoundingClientRect();
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas!.width = Math.max(1, Math.floor(canvasWidth * devicePixelRatio));
        canvas!.height = Math.max(
          1,
          Math.floor(canvasHeight * devicePixelRatio),
        );
        context!.scale(devicePixelRatio, devicePixelRatio);
      }

      function generateParticles(): void {
        // 2× quantity: upstream initCanvas() pushes `quantity` circles in
        // resizeCanvas() then another `quantity` in drawParticles() (which
        // clears the canvas but not the circles array), so the field holds
        // 2×quantity particles. Per-particle respawn keeps that count stable.
        particleList = Array.from({ length: quantity * 2 }, () =>
          createParticle(canvasWidth, canvasHeight, baseSize, vx, vy),
        );
      }

      function respawnParticle(particle: ParticleInstance): void {
        const respawned = createParticle(
          canvasWidth,
          canvasHeight,
          baseSize,
          vx,
          vy,
        );
        Object.assign(particle, respawned);
      }

      function tick(): void {
        // Belt-and-suspenders: bail without rescheduling once the canvas is
        // no longer in the document, so this loop can't outlive the
        // component even if the framework's own "Remove" hook never fires
        // (e.g. a host that wipes the DOM directly instead of going through
        // node removal).
        if (!canvas!.isConnected) return;
        context!.clearRect(0, 0, canvasWidth, canvasHeight);

        for (const particle of particleList) {
          const closestEdge = Math.min(
            particle.x + particle.translateX - particle.size,
            canvasWidth - particle.x - particle.translateX - particle.size,
            particle.y + particle.translateY - particle.size,
            canvasHeight - particle.y - particle.translateY - particle.size,
          );
          const closestEdgeAlpha = Math.max(0, closestEdge / 20);
          if (closestEdgeAlpha > 1) {
            particle.alpha = Math.min(
              particle.alpha + 0.02,
              particle.targetAlpha,
            );
          } else {
            particle.alpha = particle.targetAlpha * closestEdgeAlpha;
          }

          particle.x += particle.driftX;
          particle.y += particle.driftY;

          particle.translateX +=
            (mouseX * (particle.magnetism / staticity) - particle.translateX) /
            ease;
          particle.translateY +=
            (mouseY * (particle.magnetism / staticity) - particle.translateY) /
            ease;

          context!.beginPath();
          context!.arc(
            particle.x + particle.translateX,
            particle.y + particle.translateY,
            particle.size,
            0,
            Math.PI * 2,
          );
          context!.fillStyle = hexTokenToRgba(fillColor, particle.alpha);
          context!.fill();

          if (
            particle.x < -particle.size ||
            particle.x > canvasWidth + particle.size ||
            particle.y < -particle.size ||
            particle.y > canvasHeight + particle.size
          ) {
            respawnParticle(particle);
          }
        }

        animationFrameId = window.requestAnimationFrame(tick);
      }

      function handlePointerMove(event: PointerEvent): void {
        const rect = containerElement!.getBoundingClientRect();
        mouseX = event.clientX - rect.left - canvasWidth / 2;
        mouseY = event.clientY - rect.top - canvasHeight / 2;
      }

      resizeCanvas();
      generateParticles();
      animationFrameId = window.requestAnimationFrame(tick);

      containerElement.addEventListener("pointermove", handlePointerMove);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          resizeCanvas();
          generateParticles();
        });
        resizeObserver.observe(containerElement);
      }

      const releaseRefreshListener = refreshState.addListener(() => {
        resizeCanvas();
        generateParticles();
      });

      node.addHook("Remove", () => {
        if (animationFrameId !== null)
          window.cancelAnimationFrame(animationFrameId);
        resizeObserver?.disconnect();
        containerElement.removeEventListener("pointermove", handlePointerMove);
        releaseRefreshListener();
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

export { particles };
