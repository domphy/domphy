// Magic UI "Cool Mode" — clean-room reimplementation.
//
// A click-and-hold particle burst wrapping any element (typically a
// button): press-and-hold shoots a steady trickle of small particles from
// the pointer that scatter with springy, decaying-gravity physics.
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.
//
// Per the spec's own DOM sketch, the particle nodes are NOT nested inside
// the wrapped element — they live in one shared, full-viewport, fixed,
// `pointer-events: none` overlay appended directly to `document.body`, so
// bursts render above all page content and are pooled across every mounted
// `coolMode()` instance. A hand-rolled `requestAnimationFrame` loop (module
// singleton, not per-instance — same "one shared engine, many callers"
// shape as this package's `smoothCursor`/`particles` canvas loops)
// recomputes every live particle's position each tick and writes it via an
// imperative `transform`, giving each burst an organic, non-repeating
// trajectory that CSS keyframes can't produce. The overlay and its particles
// are torn down once no instance is mounted AND no particle is still
// in-flight, so nothing leaks into the DOM permanently.
//
// Default particle fill cycles through the theme's own color families
// (resolved once per spawn via `themeColorToken`, a concrete hex string —
// same reasoning `particles.ts` documents for its own canvas `fillStyle`:
// imperative DOM/canvas paint has no notion of a live `var(--…)` reference)
// rather than a literal random-hue string, so the "multicolored burst" stays
// theme-token-driven instead of a raw color literal.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColorToken } from "@domphy/theme";
import { button } from "@domphy/ui";

export type CoolModeParticleAppearance =
  | { kind: "circle" }
  | { kind: "image"; url: string }
  | { kind: "text"; glyph: string };

export interface CoolModeProps {
  /** Element(s) the burst effect wraps. Defaults to a small demo "Hold Me" button. */
  children?: DomphyElement | DomphyElement[];
  /** Particle appearance. Defaults to `{ kind: "circle" }` (theme-colored dots). */
  particle?: CoolModeParticleAppearance;
  /** Preset pool of particle sizes (px), randomly picked per spawn. Defaults to `[15, 20, 25, 35, 45]`. */
  sizes?: number[];
  /** Fixed particle size (px). When set, forces every particle to this exact size, overriding the random `sizes` pool. */
  size?: number;
  /** Fixed horizontal drift magnitude (px/frame). Randomized 0–10 per-particle when unset. */
  driftSpeed?: number;
  /** Fixed upward launch speed (px/frame). Randomized 0–25 per-particle when unset. */
  launchSpeed?: number;
  /** Passthrough style merged onto the thin wrapper. */
  style?: StyleObject;
}

interface CoolModeParticleInstance {
  element: HTMLElement;
  left: number;
  top: number;
  size: number;
  speedHorz: number;
  direction: number;
  speedUp: number;
  spinVal: number;
  spinSpeed: number;
}

const DEFAULT_SIZES = [15, 20, 25, 35, 45];
const MAX_CONCURRENT_PARTICLES = 45;
const SPAWN_INTERVAL_MS = 30;
const COLOR_FAMILIES: ThemeColor[] = [
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

// ---------------------------------------------------------------------------
// Shared, module-level particle engine — one overlay + one rAF loop reused
// across every mounted `coolMode()` instance.
// ---------------------------------------------------------------------------

let sharedOverlayElement: HTMLDivElement | null = null;
let sharedMountedInstanceCount = 0;
const sharedParticles: CoolModeParticleInstance[] = [];
let sharedAnimationFrame: number | null = null;
let sharedColorFamilyCursor = 0;

function ensureSharedOverlay(): HTMLDivElement {
  if (sharedOverlayElement) return sharedOverlayElement;
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "hidden";
  overlay.style.zIndex = "2147483647";
  document.body.appendChild(overlay);
  sharedOverlayElement = overlay;
  return overlay;
}

function teardownSharedOverlayIfIdle(): void {
  if (sharedMountedInstanceCount > 0 || sharedParticles.length > 0) return;
  if (sharedAnimationFrame !== null) {
    cancelAnimationFrame(sharedAnimationFrame);
    sharedAnimationFrame = null;
  }
  sharedOverlayElement?.remove();
  sharedOverlayElement = null;
}

function ensureSharedLoop(): void {
  if (sharedAnimationFrame !== null) return;
  const tick = () => {
    sharedAnimationFrame = null;
    const viewportBottom = Math.max(
      window.innerHeight,
      document.body.clientHeight,
    );
    for (let index = sharedParticles.length - 1; index >= 0; index -= 1) {
      const particle = sharedParticles[index];
      particle.left -= particle.speedHorz * particle.direction;
      particle.top -= particle.speedUp;
      // Gravity: upward speed decays 1px/frame, initial rise capped at the
      // particle's own size (matches upstream `Math.min(size, speedUp - 1)`).
      particle.speedUp = Math.min(particle.size, particle.speedUp - 1);
      particle.spinVal += particle.spinSpeed;
      if (particle.top >= viewportBottom + particle.size) {
        particle.element.remove();
        sharedParticles.splice(index, 1);
        continue;
      }
      particle.element.style.transform = `translate3d(${particle.left}px, ${particle.top}px, 0) rotate(${particle.spinVal}deg)`;
    }
    if (sharedParticles.length > 0) {
      sharedAnimationFrame = requestAnimationFrame(tick);
    } else {
      teardownSharedOverlayIfIdle();
    }
  };
  sharedAnimationFrame = requestAnimationFrame(tick);
}

function nextParticleColorToken(node: ElementNode): string {
  try {
    const family =
      COLOR_FAMILIES[sharedColorFamilyCursor % COLOR_FAMILIES.length];
    sharedColorFamilyCursor += 1;
    return themeColorToken(node, "shift-9", family);
  } catch {
    return "currentColor";
  }
}

function spawnParticle(
  node: ElementNode,
  originX: number,
  originY: number,
  appearance: CoolModeParticleAppearance,
  sizes: number[],
  fixedSize: number | undefined,
  driftSpeed: number | undefined,
  launchSpeed: number | undefined,
): void {
  if (sharedParticles.length >= MAX_CONCURRENT_PARTICLES) return;
  const overlay = ensureSharedOverlay();
  const sizePool = sizes.length > 0 ? sizes : DEFAULT_SIZES;
  // Upstream: `options?.size || sizes[...]` — a fixed `size` forces every
  // particle to one px size, overriding the random pool.
  const size =
    fixedSize || (sizePool[Math.floor(Math.random() * sizePool.length)] ?? 24);

  const element = document.createElement(
    appearance.kind === "image" ? "img" : "div",
  );
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.willChange = "transform";

  if (appearance.kind === "image") {
    (element as HTMLImageElement).src = appearance.url;
    element.style.objectFit = "cover";
    element.style.borderRadius = "50%";
  } else if (appearance.kind === "text") {
    // Upstream renders the glyph in an inner content box at fontSize=size*3
    // AND transform:scale(3) (~9x base). The outer particle element carries
    // the physics transform, so the scale lives on this independent inner box.
    const content = document.createElement("div");
    content.textContent = appearance.glyph;
    content.style.fontSize = `${size * 3}px`;
    content.style.lineHeight = "1";
    content.style.textAlign = "center";
    content.style.width = `${size}px`;
    content.style.height = `${size}px`;
    content.style.display = "flex";
    content.style.alignItems = "center";
    content.style.justifyContent = "center";
    content.style.transform = "scale(3)";
    content.style.transformOrigin = "center";
    element.appendChild(content);
  } else {
    element.style.borderRadius = "50%";
    element.style.backgroundColor = nextParticleColorToken(node);
  }

  overlay.appendChild(element);

  const speedHorz = driftSpeed ?? Math.random() * 10;
  const speedUp = launchSpeed ?? Math.random() * 25;

  sharedParticles.push({
    element,
    left: originX - size / 2,
    top: originY - size / 2,
    size,
    speedHorz,
    direction: Math.random() <= 0.5 ? -1 : 1,
    speedUp,
    spinVal: Math.random() * 360,
    spinSpeed: Math.random() * 35 * (Math.random() <= 0.5 ? -1 : 1),
  });

  ensureSharedLoop();
}

function defaultDemoTrigger(): DomphyElement<"button"> {
  return {
    button: "Hold Me",
    type: "button",
    $: [button({ color: "primary" })],
  } as DomphyElement<"button">;
}

/**
 * Wraps any element (typically a button) with a click-and-hold particle
 * burst: press to spawn a steady trickle of circles/images/glyphs that
 * scatter outward with decaying-gravity physics until they fall past the
 * bottom of the viewport. Call with no arguments for a working demo button.
 */
function coolMode(props: CoolModeProps = {}): DomphyElement<"span"> {
  const appearance =
    props.particle ?? ({ kind: "circle" } as CoolModeParticleAppearance);
  const sizes =
    props.sizes && props.sizes.length > 0 ? props.sizes : DEFAULT_SIZES;
  const children: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [defaultDemoTrigger()];

  return {
    span: children,
    style: { display: "inline-block", ...(props.style ?? {}) } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      sharedMountedInstanceCount += 1;
      const element = node.domElement as HTMLElement;

      let spawnTimer: ReturnType<typeof setInterval> | null = null;
      let lastPointerX = 0;
      let lastPointerY = 0;

      const spawnAtLastPointer = () => {
        // Belt-and-suspenders: if the wrapped element was torn down without
        // the framework's own "Remove" hook firing (e.g. a raw DOM wipe),
        // this interval would otherwise spawn particles forever. Bail and
        // self-clear instead of relying solely on pointerup/pointerleave.
        if (!element.isConnected) {
          stopEmitting();
          return;
        }
        spawnParticle(
          node,
          lastPointerX,
          lastPointerY,
          appearance,
          sizes,
          props.size,
          props.driftSpeed,
          props.launchSpeed,
        );
      };

      const trackPointer = (event: PointerEvent) => {
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
      };

      const stopEmitting = () => {
        if (spawnTimer !== null) {
          clearInterval(spawnTimer);
          spawnTimer = null;
        }
        window.removeEventListener("pointermove", trackPointer);
        window.removeEventListener("pointerup", stopEmitting);
      };

      const handlePointerDown = (event: PointerEvent) => {
        trackPointer(event);
        spawnAtLastPointer();
        stopEmitting();
        spawnTimer = setInterval(spawnAtLastPointer, SPAWN_INTERVAL_MS);
        window.addEventListener("pointermove", trackPointer);
        window.addEventListener("pointerup", stopEmitting);
      };

      element.addEventListener("pointerdown", handlePointerDown);
      element.addEventListener("pointerleave", stopEmitting);

      node.addHook("Remove", () => {
        sharedMountedInstanceCount -= 1;
        stopEmitting();
        element.removeEventListener("pointerdown", handlePointerDown);
        element.removeEventListener("pointerleave", stopEmitting);
        teardownSharedOverlayIfIdle();
      });
    },
  } as DomphyElement<"span">;
}

export { coolMode };
