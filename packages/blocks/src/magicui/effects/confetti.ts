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

import type { DomphyElement, StyleObject } from "@domphy/core";
import { behavior, ElementNode } from "@domphy/core";
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

// Raw `confetti.create(canvas, ...)` instance, or null where instance
// creation fails (no 2D context — SSR, jsdom without a canvas stub).
function createFireInstance(
  canvasElement: HTMLCanvasElement,
  globalOptions: ConfettiGlobalOptions,
): ReturnType<typeof confettiLib.create> | null {
  try {
    // `resize` is forced on regardless of the passed options — mirrors upstream.
    return confettiLib.create(canvasElement, {
      ...globalOptions,
      resize: true,
    });
  } catch {
    return null;
  }
}

const CONFETTI_BEHAVIOR_KEY = "confetti";

interface ConfettiBehaviorProps {
  baseOptions: ConfettiFireOptions;
  globalOptions: ConfettiGlobalOptions;
  autoFire: boolean;
  onReady?: (handle: ConfettiHandle) => void;
}

interface ConfettiBehaviorInstance {
  /** The stable per-node handle — created once, shared by every generation. */
  handle: ConfettiHandle | null;
  update: (props: ConfettiBehaviorProps) => void;
  destroy: () => void;
}

// The imperative confetti instance is per-DOM-node state, so it lives in a
// behavior() (`@domphy/core`) rather than the factory closure: `attach` runs
// ONCE for the real canvas node no matter how many times a reactive ancestor
// re-invokes confetti()/confettiButton(), and every later generation's props
// route into `update()`. The previous `_onMount` + closure `handle` broke
// confettiButton after any ancestor re-render — the live-rebound onClick
// closed over the NEW generation's still-null `handle`, so clicks silently
// did nothing — and `onReady` fired only for generation 1.
function attachConfetti(
  node: ElementNode,
  initialProps: ConfettiBehaviorProps,
): ConfettiBehaviorInstance {
  let { baseOptions, onReady } = initialProps;

  const canvasElement = node.domElement as HTMLCanvasElement | null;
  const fireInstance =
    canvasElement && typeof document !== "undefined"
      ? createFireInstance(canvasElement, initialProps.globalOptions)
      : null;

  // `fire` reads `baseOptions` from this closure at CALL time, so update()
  // refreshing it is enough — the handle itself never needs rebuilding.
  const handle: ConfettiHandle | null = fireInstance
    ? {
        fire: (options) => {
          fireInstance({ ...baseOptions, ...(options ?? {}) });
        },
        reset: () => fireInstance.reset(),
      }
    : null;

  if (handle) {
    // Fire the moment the canvas mounts (no delay) — mirrors upstream's mount
    // effect firing immediately when `autoFire` (upstream `!manualstart`).
    if (initialProps.autoFire) handle.fire();
    onReady?.(handle);
  }

  return {
    handle,
    update(next) {
      baseOptions = next.baseOptions;
      // A later generation's fresh `onReady` closure receives the SAME stable
      // handle (React callback-ref semantics: re-invoked on identity change).
      if (handle && next.onReady && next.onReady !== onReady) {
        next.onReady(handle);
      }
      onReady = next.onReady;
    },
    destroy() {
      handle?.reset();
    },
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
    ...behavior<ConfettiBehaviorProps>(CONFETTI_BEHAVIOR_KEY, attachConfetti, {
      baseOptions,
      globalOptions,
      autoFire,
      onReady: props.onReady,
    }),
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
    ...behavior<ConfettiBehaviorProps>(CONFETTI_BEHAVIOR_KEY, attachConfetti, {
      baseOptions,
      globalOptions: DEFAULT_GLOBAL_OPTIONS,
      autoFire: false,
    }),
  } as DomphyElement<"canvas">;

  return {
    button: [label, overlayCanvas],
    type: "button",
    $: [button({ color })],
    style: props.style,
    onClick: (event: MouseEvent, node: ElementNode) => {
      if (typeof window === "undefined") return;
      // Event handlers are live-rebound on every generation, so re-derive the
      // handle from the current node tree on every click: it lives in the
      // behavior instance of the canvas CHILD (attached once to the real
      // canvas DOM node, stable across ancestor re-renders).
      const canvasChild = node?.children.items.find(
        (child): child is ElementNode =>
          child instanceof ElementNode && child.tagName === "canvas",
      );
      const handle = canvasChild?.getBehavior<ConfettiBehaviorInstance>(
        CONFETTI_BEHAVIOR_KEY,
      )?.handle;
      if (!handle) return;
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
