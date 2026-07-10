import { toState } from "@domphy/core";
import * as THREE from "three";
import { advance, invalidate, registerFrameCallback } from "./loop.js";
import type {
  FrameCallback,
  RendererLike,
  RootState,
  SizeState,
  ThreeOptions,
} from "./types.js";

// Port of react-three-fiber's core/store.ts — builds the RootState object a
// mounted `three()` root revolves around (camera/scene/size/pointer/clock).
// Zustand's global "subscribe to any state change" store is dropped: Domphy
// has no equivalent single-store-wide subscription primitive, so the parts
// of createStore() that reacted to ANY size/dpr/camera change (the
// `rootStore.subscribe(...)` block) collapse into ONE explicit `setSize()`
// action here instead of an implicit store-wide effect — same net effect
// (renderer + camera stay in sync with size/dpr), called explicitly by
// patch.ts's ResizeObserver handler rather than fired by a store diff.

export type Dpr = number | [min: number, max: number];

export interface RootStateConfig
  extends Pick<
    ThreeOptions,
    "orthographic" | "camera" | "dpr" | "frameloop" | "onPointerMissed"
  > {
  canvas: HTMLCanvasElement;
  gl: RendererLike;
}

// A created root additionally exposes `setSize` — the reference's top-level
// `state.setSize` shortcut (store.ts's `RootState.setSize`). SPEC.md's
// types.ts does not declare it on the shared `RootState` contract (that
// contract is fixed and owned by the Contracts agent), so it is carried as
// an extra property on the object this function returns rather than widening
// the shared type. See the "setSize is not on RootState" contract gap.
export type CreatedRootState = RootState & {
  setSize(width: number, height: number, dpr?: Dpr): void;
};

// Port of core/utils.tsx's calculateDpr: resolves the Dpr option (a plain
// ratio, or a [min, max] range clamped around the real device pixel ratio)
// into the single number the renderer/size state actually use. Exported so
// patch.ts can recompute it on resize without re-deriving the same formula.
export function calculateDpr(dpr: Dpr): number {
  // Err on the side of progress by assuming 2x dpr if we can't detect it —
  // this happens in workers, where `window` exists but `devicePixelRatio`
  // doesn't.
  const target =
    typeof window !== "undefined" ? (window.devicePixelRatio ?? 2) : 1;
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], target), dpr[1]) : dpr;
}

// Port of core/utils.tsx's updateCamera: reshapes the active camera's
// frustum to match the current pixel size. `camera.manual` (set by props.ts
// when the caller supplies their own aspect/left/right/top/bottom) opts a
// user-owned camera out of this — same escape hatch as upstream.
function updateCameraForSize(camera: any, width: number, height: number): void {
  if (camera.manual) return;
  if (camera.isOrthographicCamera) {
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
  } else {
    camera.aspect = width / height;
  }
  camera.updateProjectionMatrix();
}

// Port of renderer.tsx's default-camera construction (the non-instance
// branch): a fresh PerspectiveCamera(75, 1, 0.1, 1000) — or an
// OrthographicCamera when `orthographic` — positioned at [0, 0, 5] looking at
// the origin, unless the caller adopted their own camera via
// `camera: { instance }` (SPEC.md's `primitive`-style adoption), in which
// case it is used verbatim with no defaults applied.
function createCamera(config: RootStateConfig): any {
  const cameraConfig = config.camera as { instance?: any } | undefined;
  if (cameraConfig && "instance" in cameraConfig && cameraConfig.instance) {
    return cameraConfig.instance;
  }

  const camera = config.orthographic
    ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
    : new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createRootState(config: RootStateConfig): CreatedRootState {
  const scene = new THREE.Scene();
  const camera = createCamera(config);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clock = new THREE.Clock();
  clock.start();

  const size = toState<SizeState>({
    width: 0,
    height: 0,
    dpr: calculateDpr(config.dpr ?? 1),
  });

  const root: CreatedRootState = {
    gl: config.gl,
    scene,
    camera,
    canvas: config.canvas,
    raycaster,
    pointer,
    clock,
    frameloop: config.frameloop ?? "always",
    size,
    onPointerMissed: config.onPointerMissed,

    invalidate(frames?: number) {
      invalidate(root, frames);
    },
    advance(timestamp: number, runGlobalCallbacks?: boolean) {
      advance(timestamp, runGlobalCallbacks, root);
    },
    frame(callback: FrameCallback, priority?: number) {
      return registerFrameCallback(root, callback, priority);
    },
    // Port of store.ts's setFrameloop: stops and zeroes the clock on every
    // switch, then restarts it unless the new mode is "never" (where the
    // clock stays stopped — loop.ts derives delta from the caller-supplied
    // timestamp instead, see updateRoot()).
    setFrameloop(mode: "always" | "demand" | "never") {
      root.clock.stop();
      root.clock.elapsedTime = 0;
      if (mode !== "never") {
        root.clock.start();
        root.clock.elapsedTime = 0;
      }
      root.frameloop = mode;
    },
    // The reference's setSize + setDpr + store-wide subscribe collapsed into
    // one action (see the module comment above): resolve dpr if given (else
    // keep the last resolved one), write the reactive size, resync the
    // camera frustum and the renderer, then request a frame.
    setSize(width: number, height: number, dpr?: Dpr) {
      const resolvedDpr =
        dpr !== undefined ? calculateDpr(dpr) : root.size.get().dpr;
      root.size.set({ width, height, dpr: resolvedDpr });
      updateCameraForSize(root.camera, width, height);
      if (resolvedDpr > 0) root.gl.setPixelRatio?.(resolvedDpr);
      root.gl.setSize(width, height);
      root.invalidate();
    },

    internal: {
      frameCallbacks: [],
      priorityCount: 0,
      interactive: [],
      captured: new Map(),
      initialClick: [0, 0],
      initialHits: [],
      hovered: new Map(),
      lastEvent: null,
      // Flipped to true by patch.ts right before onCreated(root) fires —
      // mirrors renderer.tsx's mount effect (state.internal.active = true
      // happens after the scene graph is mounted, not at store creation).
      active: false,
      frames: 0,
      subscribersDirty: false,
    },
  };

  return root;
}
