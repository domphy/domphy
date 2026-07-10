import {
  type Handler,
  isState,
  type PartialElement,
  type ReadableState,
  toState,
} from "@domphy/core";
import * as THREE from "three";
import { createEvents } from "./events.js";
import { registerRoot, unregisterRoot } from "./loop.js";
import { applyProps } from "./props.js";
import { disposeInstanceProperties, reconcileChildren } from "./reconciler.js";
import { createRootState } from "./rootState.js";
import type {
  RendererLike,
  RootState,
  SceneChildren,
  SceneFunction,
  SceneNode,
  ThreeOptions,
} from "./types.js";

// Port of react-three-fiber's web/Canvas.tsx (concept only — the JSX
// tree/effect model doesn't translate; this is the ONLY module that touches
// the DOM/Domphy element tree). `three()` is applied to a `div` host: it owns
// the canvas, the renderer, the RootState, and the reactive plumbing that
// keeps camera/dpr/frameloop/scene in sync with either a plain ThreeOptions
// object or a ReadableState<ThreeOptions>.
//
// Per SPEC.md's "State-in" rule and AGENTS.md's reused-node lifecycle: this
// factory may be called again with a fresh plain option object every time a
// reactive parent re-renders, but `_onMount` runs exactly ONCE for the real
// DOM node it ends up bound to — so everything below closes over whichever
// `options` value the FIRST call received. Passing a `ReadableState` is how a
// caller keeps updating a long-lived mount; a plain object is captured once
// and never revisited (this mirrors ElementAttribute/reconciler's own
// once-per-node contract, not a limitation specific to this package).

// A standalone SceneNode wrapper around an object that already exists outside
// the reconciler's own create/dispose lifecycle (the root's camera, its
// raycaster, its scene). Reuses props.ts's applyProps (duck-typed value
// application, function-prop dispatch, release-before-rebind) without asking
// the reconciler to create/own/dispose the underlying instance itself.
function createWrapperNode(
  tag: string,
  instance: any,
  root: RootState,
): SceneNode {
  return {
    tag,
    instance,
    root,
    parent: null,
    children: [],
    key: null,
    props: {},
    attach: null,
    previousAttach: undefined,
    isPrimitive: true,
    autoDispose: false,
    releases: [],
    disposed: false,
  };
}

// A `camera` option shaped `{ instance }` adopts a user-owned camera verbatim
// (rootState.ts's createCamera already does the adoption itself) — no props
// are applied on top of it, matching r3f's `!isCamera` gate around
// `applyProps(camera, cameraOptions)`.
function isCameraAdopted(
  config: ThreeOptions["camera"],
): config is { instance: any } {
  return (
    !!config &&
    typeof config === "object" &&
    "instance" in config &&
    !!(config as { instance?: any }).instance
  );
}

// Frustum-shaping keys — once the caller sets any of these by hand, the
// camera must stop being reshaped by every later ResizeObserver tick.
const CAMERA_FRUSTUM_KEYS = ["aspect", "left", "right", "top", "bottom"];

function applyCameraConfig(
  cameraNode: SceneNode,
  config: ThreeOptions["camera"],
): void {
  if (!config || isCameraAdopted(config)) return;
  applyProps(cameraNode, config);

  // Preserve an explicit user-defined frustum across later automatic resizes
  // (r3f parity, https://github.com/pmndrs/react-three-fiber/issues/3160):
  // rootState.ts's `updateCameraForSize` (driven by the ResizeObserver set up
  // in `_onMount` below, which always runs right after this) skips a camera
  // flagged `.manual` — without this flag the very first resize would
  // immediately stomp the aspect/frustum values just applied above.
  const camera = cameraNode.instance;
  if (!camera.manual && CAMERA_FRUSTUM_KEYS.some((key) => key in config)) {
    camera.manual = true;
    camera.updateProjectionMatrix();
  }
}

// Port of renderer.tsx's shadow/color-space/tone-mapping setup, applied once
// at mount (SPEC.md's ReadableState re-apply list is camera/dpr/frameloop/
// scene only — shadows/flat/linear are not meant to be reactive here). Each
// field is only touched when the renderer actually carries it (WebGPU-style
// renderers may not).
function applyRendererConfig(gl: RendererLike, options: ThreeOptions): void {
  if (gl.shadowMap) {
    const shadows = options.shadows;
    gl.shadowMap.enabled = !!shadows;
    if (shadows === true) {
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
    } else if (typeof shadows === "string") {
      const types: Record<string, number> = {
        basic: THREE.BasicShadowMap,
        percentage: THREE.PCFShadowMap,
        soft: THREE.PCFSoftShadowMap,
        variance: THREE.VSMShadowMap,
      };
      gl.shadowMap.type = types[shadows] ?? THREE.PCFSoftShadowMap;
    }
  }
  if ("toneMapping" in gl) {
    gl.toneMapping = options.flat
      ? THREE.NoToneMapping
      : THREE.ACESFilmicToneMapping;
  }
  if ("outputColorSpace" in gl) {
    gl.outputColorSpace = options.linear
      ? THREE.LinearSRGBColorSpace
      : THREE.SRGBColorSpace;
  }
}

/**
 * Renders a declarative three.js scene graph on a `div` host.
 * Apply to a `div` with explicit width and height.
 *
 * @hostTag div
 * @param options - Scene configuration, or a reactive state wrapping one.
 * @example
 * { div: null, $: [three({
 *     scene: [{ mesh: [{ boxGeometry: null }, { meshStandardMaterial: null }] }],
 *   })],
 *   style: { width: "600px", height: "400px" } }
 */
function three(
  options: ThreeOptions | ReadableState<ThreeOptions>,
): PartialElement {
  const optionsState = toState(options);

  return {
    style: {
      position: "relative",
      overflow: "hidden",
    },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const initialOptions = optionsState.get();

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.touchAction = "none";
      container.appendChild(canvas);

      const gl: RendererLike = initialOptions.createRenderer
        ? initialOptions.createRenderer(canvas)
        : new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            ...initialOptions.gl,
          });

      const root = createRootState({
        canvas,
        gl,
        orthographic: initialOptions.orthographic,
        camera: initialOptions.camera,
        dpr: initialOptions.dpr,
        frameloop: initialOptions.frameloop,
        onPointerMissed: initialOptions.onPointerMissed,
      });
      // Mount-time only (SPEC.md's re-apply list doesn't include `linear`) —
      // stashed on the root defensively since RootState's shared contract
      // doesn't carry it; props.ts reads it back the same way when deciding
      // whether to auto-convert an assigned texture's colorSpace to sRGB.
      (root as any).linear = initialOptions.linear;

      const cameraNode = createWrapperNode("camera", root.camera, root);
      applyCameraConfig(cameraNode, initialOptions.camera);

      const raycasterNode = createWrapperNode(
        "raycaster",
        root.raycaster,
        root,
      );
      if (initialOptions.raycaster) {
        // `params` (per-object-type default thresholds: Mesh/Line/LOD/Points/
        // Sprite) is merged onto the existing defaults rather than applied
        // through the generic duck-typed path — otherwise a caller who only
        // wants to override e.g. `Points.threshold` would wholesale replace
        // Line/Mesh/LOD/Sprite's defaults too. Mirrors r3f's renderer.tsx.
        const { params, ...raycasterOptions } = initialOptions.raycaster;
        applyProps(raycasterNode, raycasterOptions);
        if (params) {
          applyProps(raycasterNode, {
            params: { ...root.raycaster.params, ...params },
          });
        }
      }

      applyRendererConfig(gl, initialOptions);

      const measureSize = (): { width: number; height: number } => {
        const rect = container.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      };
      const initialSize = measureSize();
      root.setSize(initialSize.width, initialSize.height);

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        const rect = entry ? entry.contentRect : measureSize();
        root.setSize(rect.width, rect.height);
      });
      resizeObserver.observe(container);

      const events =
        initialOptions.events === false ? null : createEvents(root);
      events?.connect(canvas);

      // Reactive `scene` function (SceneFunction) → own release-before-rebind
      // listener driving reconcileChildren, mirroring reconciler.ts's own
      // (unexported, per-child) `setupFunctionChildren` for this root node.
      const rootSceneNode = createWrapperNode("scene", root.scene, root);
      let releaseSceneFunction: (() => void) | null = null;
      const applyScene = (sceneValue: SceneChildren | SceneFunction): void => {
        releaseSceneFunction?.();
        releaseSceneFunction = null;

        if (typeof sceneValue !== "function") {
          reconcileChildren(rootSceneNode, sceneValue, root);
          return;
        }

        let subscriptions: Array<() => void> = [];
        const sceneFunction = sceneValue as unknown as (
          listener: Handler,
          root: RootState,
        ) => SceneChildren;
        const listener: Handler = (() => {
          const result = sceneFunction(listener, root);
          reconcileChildren(rootSceneNode, result, root);
        }) as Handler;
        listener.onSubscribe = (release: () => void) =>
          subscriptions.push(release);
        releaseSceneFunction = () => {
          for (const release of subscriptions) release();
          subscriptions = [];
        };
        listener();
      };
      applyScene(initialOptions.scene);

      registerRoot(root);
      root.internal.active = true;
      initialOptions.onCreated?.(root);

      // ReadableState option → re-apply camera/dpr/frameloop/scene on every
      // change (SPEC.md's locked re-apply list — shadows/flat/linear/gl/
      // raycaster/events are mount-time-only, see applyRendererConfig above).
      const optionReleases: Array<() => void> = [];
      if (isState(options)) {
        const listener: Handler = (() => {
          const next = optionsState.get(listener);
          applyCameraConfig(cameraNode, next.camera);
          const currentSize = root.size.get();
          root.setSize(currentSize.width, currentSize.height, next.dpr);
          root.setFrameloop(next.frameloop ?? "always");
          applyScene(next.scene);
        }) as Handler;
        listener.onSubscribe = (release: () => void) =>
          optionReleases.push(release);
        optionsState.get(listener);
      }

      node.addHook("Remove", () => {
        events?.disconnect();
        root.internal.active = false;
        unregisterRoot(root);
        releaseSceneFunction?.();
        reconcileChildren(rootSceneNode, null, root);
        // Backstop for anything assigned directly onto the scene as a plain
        // prop (background/environment/fog) rather than through a reconciled
        // SceneNode child — mirrors r3f's `dispose(state.scene)` at
        // unmountComponentAtNode.
        disposeInstanceProperties(root.scene);
        // WebGLRenderer.dispose() only clears internal bookkeeping caches —
        // it does NOT release the underlying WebGL context. Without
        // forceContextLoss(), repeated mount/unmount cycles leak contexts
        // until the browser hits its concurrent-context cap. Mirrors r3f's
        // unmountComponentAtNode teardown exactly.
        (root.gl as any).renderLists?.dispose?.();
        (root.gl as any).forceContextLoss?.();
        root.gl.dispose?.();
        resizeObserver.disconnect();
        for (const release of cameraNode.releases.splice(0)) release();
        for (const release of raycasterNode.releases.splice(0)) release();
        for (const release of optionReleases.splice(0)) release();
      });
    },
  };
}

export { three };
