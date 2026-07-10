// Port of react-three-fiber's core/loop.ts — the module-level global render
// loop shared by every mounted root. Translated from React's ref/store model
// to plain function calls over RootState objects; React scheduler and XR
// frame bits are dropped (RendererLike carries no `.xr`, FrameCallback takes
// no XRFrame — neither exists in this package's contract).
import type { FrameCallback, RootState } from "./types.js";

// ---- Module-level root registry --------------------------------------------
// Every mounted `three()` root registers itself here so the single shared
// rAF loop can iterate all of them each tick. patch.ts registers on mount and
// unregisters on teardown (alongside setting internal.active = false).
const roots = new Set<RootState>();

export function registerRoot(root: RootState): void {
  roots.add(root);
}

export function unregisterRoot(root: RootState): void {
  roots.delete(root);
}

// ---- Global before/after/tail effects --------------------------------------
// Timestamp-only hooks that run once per tick across all roots (r3f's
// addEffect/addAfterEffect/addTail). "before"/"after" bracket every render
// pass (loop() and advance(), gated by the runGlobalCallbacks flag); "tail"
// fires once when the automatic loop has nothing left to render and stops.
export type GlobalCallback = (timestamp: number) => void;
type GlobalEffectType = "before" | "after" | "tail";

const beforeEffects = new Set<GlobalCallback>();
const afterEffects = new Set<GlobalCallback>();
const tailEffects = new Set<GlobalCallback>();

function subscribeGlobal(
  callback: GlobalCallback,
  group: Set<GlobalCallback>,
): () => void {
  group.add(callback);
  return () => {
    group.delete(callback);
  };
}

export const addEffect = (callback: GlobalCallback): (() => void) =>
  subscribeGlobal(callback, beforeEffects);
export const addAfterEffect = (callback: GlobalCallback): (() => void) =>
  subscribeGlobal(callback, afterEffects);
export const addTail = (callback: GlobalCallback): (() => void) =>
  subscribeGlobal(callback, tailEffects);

function invokeGlobalCallbacks(
  group: Set<GlobalCallback>,
  timestamp: number,
): void {
  for (const callback of group) callback(timestamp);
}

export function flushGlobalEffects(
  type: GlobalEffectType,
  timestamp: number,
): void {
  if (type === "before") invokeGlobalCallbacks(beforeEffects, timestamp);
  else if (type === "after") invokeGlobalCallbacks(afterEffects, timestamp);
  else invokeGlobalCallbacks(tailEffects, timestamp);
}

// ---- Per-root frame subscribers (useFrame analog) --------------------------
// Registers a per-frame callback on a root. priority > 0 callbacks take
// rendering into their own hands: as long as any exist, the root skips its
// own gl.render call, so a custom render pass (e.g. postprocessing) owns the
// canvas instead.
export function registerFrameCallback(
  root: RootState,
  callback: FrameCallback,
  priority = 0,
): () => void {
  const entry = { callback, priority };
  root.internal.frameCallbacks.push(entry);
  if (priority > 0) root.internal.priorityCount += 1;
  root.internal.subscribersDirty = true;
  return () => {
    const index = root.internal.frameCallbacks.indexOf(entry);
    if (index === -1) return;
    root.internal.frameCallbacks.splice(index, 1);
    if (priority > 0) root.internal.priorityCount -= 1;
  };
}

// Sort lowest-to-highest priority right before running them, so a higher
// priority subscriber (e.g. a custom render pass) always runs — and
// therefore renders — after every lower-priority one: "on top" of the rest.
// Sorting is deferred to this lazy pass (subscribersDirty) rather than done
// eagerly on every register/unregister call.
function sortFrameCallbacksIfDirty(root: RootState): void {
  if (!root.internal.subscribersDirty) return;
  root.internal.frameCallbacks.sort((a, b) => a.priority - b.priority);
  root.internal.subscribersDirty = false;
}

// True while the loop is iterating frame subscribers across all roots —
// mirrors r3f's useFrameInProgress: an invalidate() call made from inside a
// frame callback needs one extra frame, since the current one is already
// spent by the time the callback runs.
let runningFrameCallbacks = false;

function updateRoot(root: RootState, timestamp: number): number {
  let delta = root.clock.getDelta();

  // In frameloop="never" mode the clock isn't running — delta is derived
  // from the caller-supplied timestamp instead.
  if (root.frameloop === "never") {
    delta = timestamp - root.clock.elapsedTime;
    root.clock.oldTime = root.clock.elapsedTime;
    root.clock.elapsedTime = timestamp;
  }

  sortFrameCallbacksIfDirty(root);
  const callbacks = root.internal.frameCallbacks;
  for (let index = 0; index < callbacks.length; index++) {
    callbacks[index].callback(root, delta);
  }

  // A priority > 0 subscriber owns rendering — skip the root's own render.
  if (root.internal.priorityCount === 0)
    root.gl.render(root.scene, root.camera);

  root.internal.frames = Math.max(0, root.internal.frames - 1);
  return root.frameloop === "always" ? 1 : root.internal.frames;
}

// ---- Global rAF loop --------------------------------------------------------
let running = false;
let frameHandle = 0;

// Renders every active, due root once, then reschedules itself unless
// nothing asked for another frame (demand-mode roots with no pending frames,
// never-mode roots, or inactive roots all count as "not due").
export function loop(timestamp: number): void {
  frameHandle = requestAnimationFrame(loop);
  running = true;
  let repeat = 0;

  flushGlobalEffects("before", timestamp);

  runningFrameCallbacks = true;
  for (const root of roots) {
    if (
      root.internal.active &&
      (root.frameloop === "always" || root.internal.frames > 0)
    ) {
      repeat += updateRoot(root, timestamp);
    }
  }
  runningFrameCallbacks = false;

  flushGlobalEffects("after", timestamp);

  if (repeat === 0) {
    // Nothing invalidated another frame — run tail effects and stop the loop.
    flushGlobalEffects("tail", timestamp);
    running = false;
    cancelAnimationFrame(frameHandle);
  }
}

// Requests a render for one root. A torn-down root (internal.active false)
// or a "never" frameloop root (fully manual — see advance()) are no-ops.
// `frames > 1` bumps the demand counter directly (legacy r3f parity);
// otherwise it requests one frame, or two when called from inside a frame
// callback, since the current frame is already spent.
export function invalidate(root: RootState, frames = 1): void {
  if (!root.internal.active || root.frameloop === "never") return;

  if (frames > 1) {
    root.internal.frames = Math.min(60, root.internal.frames + frames);
  } else {
    root.internal.frames = runningFrameCallbacks ? 2 : 1;
  }

  if (!running) {
    running = true;
    frameHandle = requestAnimationFrame(loop);
  }
}

// Manually renders a frame, bypassing the frameloop gate entirely (no
// active/frames/mode check) — the only way a "never" mode root ever renders,
// and a general escape hatch for deterministic stepping (tests, external
// clocks). Renders every registered root when called without one.
export function advance(
  timestamp: number,
  runGlobalCallbacks = true,
  root?: RootState,
): void {
  if (runGlobalCallbacks) flushGlobalEffects("before", timestamp);
  if (root) updateRoot(root, timestamp);
  else for (const each of roots) updateRoot(each, timestamp);
  if (runGlobalCallbacks) flushGlobalEffects("after", timestamp);
}
