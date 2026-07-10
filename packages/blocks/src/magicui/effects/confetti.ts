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
import type { ThemeColor } from "@domphy/theme";
import { button } from "@domphy/ui";
import type {
  GlobalOptions as ConfettiLibGlobalOptions,
  Options as ConfettiLibOptions,
} from "canvas-confetti";
import confettiLib from "canvas-confetti";

export type ConfettiFireOptions = ConfettiLibOptions;
/** Instance-creation options passed to `canvas-confetti`'s `confetti.create(...)`. */
export type ConfettiGlobalOptions = ConfettiLibGlobalOptions;

export interface ConfettiHandle {
  /** Launches one burst, merging `options` over the instance's base options. */
  fire: (options?: ConfettiFireOptions) => void;
  /** Immediately clears all in-flight particles. */
  reset: () => void;
}

export interface ConfettiProps {
  /** Base options merged under every `fire()` call. See `canvas-confetti`'s `Options`. */
  options?: ConfettiFireOptions;
  /**
   * Options for the underlying `confetti.create(canvas, ...)` instance (mirrors
   * upstream's `globalOptions` prop). Defaults to `{ resize: true, useWorker: true }`;
   * `resize` is always forced on so the canvas tracks its element size.
   */
  globalOptions?: ConfettiGlobalOptions;
  /** Called once the canvas is mounted and the imperative handle is ready. */
  onReady?: (handle: ConfettiHandle) => void;
  /** Fires one burst automatically the moment the canvas mounts. Defaults to `true`. */
  autoFire?: boolean;
  /**
   * Foreground content rendered after the canvas (mirrors upstream's `{children}`).
   * The burst is reachable from these children via the `onReady` handle — Domphy's
   * equivalent of upstream's `ConfettiContext`, which has no runtime-context analog.
   */
  children?: DomphyElement | DomphyElement[];
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

// Matches upstream's `globalOptions` default.
const DEFAULT_GLOBAL_OPTIONS: ConfettiGlobalOptions = {
  resize: true,
  useWorker: true,
};

function createConfettiHandle(
  canvasElement: HTMLCanvasElement,
  baseOptions: ConfettiFireOptions,
  globalOptions: ConfettiGlobalOptions,
): ConfettiHandle | null {
  let instanceFire: ReturnType<typeof confettiLib.create> | null = null;
  try {
    // `resize` is forced on regardless of the passed options — mirrors upstream.
    instanceFire = confettiLib.create(canvasElement, {
      ...globalOptions,
      resize: true,
    });
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
 * demand. Call with no arguments for a working demo — a burst fires the instant
 * the canvas mounts (`autoFire` defaults to `true`); pass `autoFire: false` for
 * a purely imperative canvas that stays inert until `onReady`'s handle fires it.
 * Pass `children` to render foreground content over the burst (they reach `fire`
 * through the `onReady` handle).
 */
function confetti(props: ConfettiProps = {}): DomphyElement {
  const baseOptions: ConfettiFireOptions = {
    ...DEFAULT_FIRE_OPTIONS,
    ...(props.options ?? {}),
  };
  const globalOptions: ConfettiGlobalOptions = {
    ...DEFAULT_GLOBAL_OPTIONS,
    ...(props.globalOptions ?? {}),
  };
  const autoFire = props.autoFire ?? true;

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors fadeOverlay() in the
  // marquee block).
  const canvasElementNode = {
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

      const handle = createConfettiHandle(
        canvasElement,
        baseOptions,
        globalOptions,
      );
      if (!handle) return;

      // Fire the moment the canvas mounts (no delay) — mirrors upstream's mount
      // effect firing immediately when `autoFire` (upstream `!manualstart`).
      if (autoFire) handle.fire();

      props.onReady?.(handle);

      node.addHook("Remove", () => handle.reset());
    },
  } as DomphyElement<"canvas">;

  const children = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : null;
  if (!children || children.length === 0) return canvasElementNode;

  // Upstream wraps `<canvas>` + `{children}` in a context Provider, which emits
  // no DOM node of its own. `display: contents` reproduces that: the wrapper
  // collapses so children sit where the confetti element was placed.
  return {
    div: [canvasElementNode, ...children],
    style: { display: "contents" } as StyleObject,
  } as DomphyElement<"div">;
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
function confettiButton(
  props: ConfettiButtonProps = {},
): DomphyElement<"button"> {
  const label: DomphyElement | string = props.children ?? "🎉 Celebrate";
  const color = props.color ?? "primary";
  const baseOptions: ConfettiFireOptions = {
    ...DEFAULT_FIRE_OPTIONS,
    ...(props.options ?? {}),
  };

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
      handle = createConfettiHandle(
        canvasElement,
        baseOptions,
        DEFAULT_GLOBAL_OPTIONS,
      );
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
      const originX =
        (buttonRect.left + buttonRect.width / 2) / window.innerWidth;
      const originY =
        (buttonRect.top + buttonRect.height / 2) / window.innerHeight;
      handle.fire({ origin: { x: originX, y: originY } });
    },
  } as DomphyElement<"button">;
}

export { confetti, confettiButton };
