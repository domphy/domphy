// Public barrel — SPEC.md "Definition of done" #6: exactly `three`, `extend`,
// `loadAsset`, `preloadAsset`, `clearAsset`, `diagnose`, `validate`, plus the
// public types userland code needs to author/type a scene (ThreeOptions/SceneNode grammar,
// RootState, the renderer contract, and the pointer-event shapes onClick/
// onPointerMove etc. hand back). Internal primitives (reconciler.ts's
// create/patch/dispose, props.ts's applyProps/attach/detach, loop.ts's
// registry/global-effect functions, rootState.ts's createRootState,
// events.ts's swapInteractivity/removeInteractivity) are deliberately NOT
// re-exported here — they are this package's own implementation, not part of
// its public surface.

export { extend } from "./catalog.js";
export type {
  SceneDiagnoseOptions,
  SceneDiagnostic,
  SceneSeverity,
  SceneValidationReport,
  SceneValidationSummary,
} from "./diagnose.js";
export { diagnose, validate } from "./diagnose.js";
export type {
  DomEvent,
  EventCaptureTarget,
  Intersection,
  ThreeEvent,
} from "./events.js";
export type { AssetResult } from "./loader.js";
export { clearAsset, loadAsset, preloadAsset } from "./loader.js";
export { three } from "./patch.js";
export type {
  Constructable,
  FrameCallback,
  RendererLike,
  RootInternal,
  RootState,
  SceneChild,
  SceneChildren,
  SceneFunction,
  SceneNode,
  SizeState,
  ThreeOptions,
} from "./types.js";
