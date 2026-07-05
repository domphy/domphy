// Magic UI "Confetti" — clean-room reimplementation.
//
// A celebratory burst of colorful falling particles rendered on a
// transparent canvas, fired programmatically (via an imperative handle) or
// from a ready-made button variant that fires on click. Implemented purely
// from the block's public functional/visual spec — no upstream Magic UI
// source was viewed or copied.
//
// Rendering/physics are delegated to `canvas-confetti` (already an approved
// dependency of this package) rather than hand-rolling a particle simulator —
// it is the standard lightweight confetti-burst library, and using its public
// `create(canvas, options)` API is a legitimate, independent integration, not
// a copy of any UI framework's component source.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { button } from "@domphy/ui";
import type { ThemeColor } from "@domphy/theme";
import confettiLib from "canvas-confetti";
import type { Options as ConfettiLibOptions } from "canvas-confetti";

export type ConfettiFireOptions = ConfettiLibOptions;

export interface ConfettiHandle {
  /** Launches one burst, merging `options` over the instance's base options. */
  fire: (options?: ConfettiFireOptions) => void;
  /** Immediately clears all in-flight particles. */
  reset: () => void;
}

export interface ConfettiProps {
  /** Base options merged under every `fire()` call. See `canvas-confetti`'s `Options`. */
  options?: ConfettiFireOptions;
  /** Called once the canvas is mounted and the imperative handle is ready. */
  onReady?: (handle: ConfettiHandle) => void;
  /** Fires one burst automatically shortly after mount. Defaults to `true`. */
  autoFire?: boolean;
  /** Delay (ms) before the automatic burst. Defaults to `150`. */
  autoFireDelay?: number;
  /** Passthrough style merged onto the canvas. */
  style?: StyleObject;
}

// Matches canvas-confetti's own documented defaults (particleCount ~50,
// angle 90/straight-up, spread 45, startVelocity 45, decay 0.9, gravity 1,
// ticks 200, origin centered), plus the spec's default shape mix of square,
// circle, and star.
const DEFAULT_FIRE_OPTIONS: ConfettiFireOptions = {
  particleCount: 50,
  angle: 90,
  spread: 45,
  startVelocity: 45,
  decay: 0.9,
  gravity: 1,
  ticks: 200,
  shapes: ["square", "circle", "star"],
  origin: { x: 0.5, y: 0.5 },
};

function createConfettiHandle(
  canvasElement: HTMLCanvasElement,
  baseOptions: ConfettiFireOptions,
): ConfettiHandle | null {
  let instanceFire: ReturnType<typeof confettiLib.create> | null = null;
  try {
    instanceFire = confettiLib.create(canvasElement, { resize: true, useWorker: false });
  } catch {
    instanceFire = null;
  }
  if (!instanceFire) return null;

  const fire = instanceFire;
  return {
    fire: (options) => {
      fire({ ...baseOptions, ...(options ?? {}) });
    },
    reset: () => fire.reset(),
  };
}

/**
 * A transparent, full-viewport canvas that fires a `canvas-confetti` burst on
 * demand. Call with no arguments for a working demo — a burst fires shortly
 * after mount (`autoFire` defaults to `true`); pass `autoFire: false` for a
 * purely imperative canvas that stays inert until `onReady`'s handle fires it.
 */
function confetti(props: ConfettiProps = {}): DomphyElement<"canvas"> {
  const baseOptions: ConfettiFireOptions = { ...DEFAULT_FIRE_OPTIONS, ...(props.options ?? {}) };
  const autoFire = props.autoFire ?? true;
  const autoFireDelay = props.autoFireDelay ?? 150;

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors fadeOverlay() in the
  // marquee block).
  const element = {
    canvas: null,
    ariaHidden: "true",
    // Decorative/transparent burst surface with no text of its own — exempt
    // from the missing-color contract (no reactive themeColor is used here).
    _doctorDisable: "missing-color",
    style: {
      position: "fixed",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 9999,
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      const canvasElement = node.domElement as HTMLCanvasElement | null;
      if (!canvasElement || typeof document === "undefined") return;

      const handle = createConfettiHandle(canvasElement, baseOptions);
      if (!handle) return;

      let autoFireTimer: ReturnType<typeof setTimeout> | null = null;
      if (autoFire) {
        autoFireTimer = setTimeout(() => handle.fire(), autoFireDelay);
      }

      props.onReady?.(handle);

      node.addHook("Remove", () => {
        if (autoFireTimer) clearTimeout(autoFireTimer);
        handle.reset();
      });
    },
  };
  return element as DomphyElement<"canvas">;
}

export interface ConfettiButtonProps {
  /** Button label content. Defaults to `"🎉 Celebrate"`. */
  children?: DomphyElement | string;
  /** Fire options merged under the burst launched on click. */
  options?: ConfettiFireOptions;
  /** Button color tone. Defaults to `"primary"`. */
  color?: ThemeColor;
  /** Passthrough style merged onto the button. */
  style?: StyleObject;
}

/**
 * A themed button that fires a `canvas-confetti` burst originating from its
 * own position on click. Call with no arguments for a working "🎉 Celebrate"
 * demo button.
 */
function confettiButton(props: ConfettiButtonProps = {}): DomphyElement<"button"> {
  const label: DomphyElement | string = props.children ?? "🎉 Celebrate";
  const color = props.color ?? "primary";
  const baseOptions: ConfettiFireOptions = { ...DEFAULT_FIRE_OPTIONS, ...(props.options ?? {}) };

  let handle: ConfettiHandle | null = null;

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors fadeOverlay() in the
  // marquee block).
  const overlayCanvas = {
    canvas: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "fixed",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 9999,
    },
    _onMount: (node: ElementNode) => {
      const canvasElement = node.domElement as HTMLCanvasElement | null;
      if (!canvasElement || typeof document === "undefined") return;
      handle = createConfettiHandle(canvasElement, baseOptions);
      node.addHook("Remove", () => {
        handle?.reset();
        handle = null;
      });
    },
  } as DomphyElement<"canvas">;

  return {
    button: [label, overlayCanvas],
    type: "button",
    $: [button({ color })],
    style: props.style,
    onClick: (event: MouseEvent) => {
      if (!handle || typeof window === "undefined") return;
      const targetElement = event.currentTarget as HTMLElement;
      const buttonRect = targetElement.getBoundingClientRect();
      const originX = (buttonRect.left + buttonRect.width / 2) / window.innerWidth;
      const originY = (buttonRect.top + buttonRect.height / 2) / window.innerHeight;
      handle.fire({ origin: { x: originX, y: originY } });
    },
  } as DomphyElement<"button">;
}

export { confetti, confettiButton };
