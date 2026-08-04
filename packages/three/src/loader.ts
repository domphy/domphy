import type { ReadableState } from "@domphy/core";
import { State } from "@domphy/core";
import type { Constructable } from "./types.js";

declare const process: { env: Record<string, string | undefined> } | undefined;

// Dev-only warning guard, same pattern as @domphy/core's dev.ts — production
// bundlers fold this to `false` and tree-shake the guarded warning away.
const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production";

// Port of react-three-fiber's `useLoader` (core/hooks.tsx), translated from
// Suspense-driven React state to a plain module-level cache backed by
// Domphy's `State`. Behavior kept 1-1 with the reference:
// - a loader CLASS is instantiated once and reused for every load with that
//   class (loaders like DRACOLoader carry stateful config, so recreating one
//   per call would be wasteful/wrong);
// - `configure` (r3f's `extensions`) runs once per loader instance, right
//   before the first `.load()` call that instance ever makes;
// - the asset cache itself is keyed by LoaderClass + input, and only runs the
//   actual load on a cache miss — a cache hit returns the very same
//   AssetResult, `configure` included.

export interface AssetResult<T = any> {
  data: ReadableState<T | null>;
  error: ReadableState<Error | null>;
  promise: Promise<T>;
}

// One loader instance per LoaderClass, reused across every input it loads.
const loaderInstances = new WeakMap<Constructable, any>();

// Loader instances on which `configure` already ran. Instances are shared
// per LoaderClass (getLoaderInstance above), so a per-cache-miss call would
// re-apply a non-idempotent configure (e.g. draco/plugin registration) on
// the same instance — the r3f semantics are once per instance, right before
// that instance's first `.load()`.
const configuredInstances = new WeakSet<object>();

// A cached load plus the configure it ran with, so a cache HIT that passes a
// different configure can warn instead of silently ignoring it.
interface CacheEntry {
  result: AssetResult<any>;
  configure?: (loader: any) => void;
  configureWarned?: boolean;
}

// AssetResult cache, keyed by LoaderClass then by a string derived from input.
const assetCache = new Map<Constructable, Map<string, CacheEntry>>();

function cacheKey(input: string | string[]): string {
  return Array.isArray(input) ? input.join("\0") : input;
}

function getLoaderInstance(LoaderClass: Constructable): any {
  let loader = loaderInstances.get(LoaderClass);
  if (!loader) {
    loader = new LoaderClass();
    loaderInstances.set(LoaderClass, loader);
  }
  return loader;
}

// Collects named nodes/materials/meshes from a loaded Object3D graph (r3f's
// `buildGraph`), so `result.nodes.Foo` / `result.materials.Bar` work without
// a separate traversal call. Only meaningful for objects with `.traverse`.
function buildGraph(object: any): {
  nodes: Record<string, any>;
  materials: Record<string, any>;
  meshes: Record<string, any>;
} {
  const graph = {
    nodes: {} as Record<string, any>,
    materials: {} as Record<string, any>,
    meshes: {} as Record<string, any>,
  };
  if (typeof object?.traverse === "function") {
    object.traverse((child: any) => {
      if (child.name) graph.nodes[child.name] = child;
      if (child.material && !graph.materials[child.material.name]) {
        graph.materials[child.material.name] = child.material;
      }
      if (child.isMesh && !graph.meshes[child.name]) {
        graph.meshes[child.name] = child;
      }
    });
  }
  return graph;
}

function loadFromUrl(loader: any, url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (data: any) => {
        // gltf-style results expose `.scene` — passthrough the node graph
        // onto the result itself, matching r3f's useLoader.
        if (data?.scene?.isObject3D)
          Object.assign(data, buildGraph(data.scene));
        resolve(data);
      },
      undefined,
      (loadError: unknown) => {
        // XHR-based loaders reject with a ProgressEvent, not an Error — its
        // `.message` is undefined, so fall back to String(). The original
        // failure is chained as `cause` so callers don't lose it.
        const message =
          (loadError as { message?: string })?.message ?? String(loadError);
        reject(
          new Error(`Could not load ${url}: ${message}`, {
            cause: loadError,
          }),
        );
      },
    );
  });
}

export function loadAsset<T = any>(
  LoaderClass: Constructable,
  input: string | string[],
  configure?: (loader: any) => void,
): AssetResult<T> {
  let byInput = assetCache.get(LoaderClass);
  if (!byInput) {
    byInput = new Map();
    assetCache.set(LoaderClass, byInput);
  }

  const key = cacheKey(input);
  const cached = byInput.get(key);
  if (cached) {
    // The cache hit returns the first load's AssetResult — a DIFFERENT
    // configure passed here would never run (the loader was already
    // configured and the asset already loaded), so say so instead of
    // silently dropping it.
    if (
      __DEV__ &&
      configure &&
      configure !== cached.configure &&
      !cached.configureWarned
    ) {
      cached.configureWarned = true;
      console.warn(
        "[@domphy/three] loadAsset: a different `configure` was passed for an " +
          "already-cached asset — the first call's configuration wins and this " +
          "one is ignored. Keep the configure function referentially stable " +
          "across call sites, or clearAsset() first.",
      );
    }
    return cached.result as AssetResult<T>;
  }

  const loader = getLoaderInstance(LoaderClass);
  // Marked before the call so a throwing configure is not retried on the
  // next cache miss — partial configuration is the caller's bug to fix, not
  // something a second apply would heal.
  if (configure && !configuredInstances.has(loader)) {
    configuredInstances.add(loader);
    configure(loader);
  }

  const data = new State<T | null>(null, "asset-data");
  const error = new State<Error | null>(null, "asset-error");

  const promise: Promise<T> = Array.isArray(input)
    ? (Promise.all(input.map((url) => loadFromUrl(loader, url))) as Promise<T>)
    : (loadFromUrl(loader, input) as Promise<T>);

  promise.then(
    (result) => data.set(result),
    (loadError: Error) => error.set(loadError),
  );

  const result: AssetResult<T> = { data, error, promise };
  byInput.set(key, { result, configure });
  return result;
}

export function preloadAsset(
  LoaderClass: Constructable,
  input: string | string[],
  configure?: (loader: any) => void,
): Promise<unknown> {
  return loadAsset(LoaderClass, input, configure).promise;
}

export interface ClearAssetOptions {
  /**
   * Also dispose GPU resources held by the cached result(s) — geometries,
   * materials, and textures reachable from the loaded data (via `.dispose()`,
   * and by traversing Object3D graphs for `geometry`/`material`/`isTexture`
   * members). Default: `false`. Only already-resolved data is disposed; a
   * still-pending load is simply evicted.
   */
  dispose?: boolean;
}

// Disposes dispose-capable objects reachable from a loaded asset: the data
// itself (textures, geometries), array results, plain wrapper objects
// (gltf-style `{ scene, nodes, materials }` — walked a bounded two levels
// deep), and Object3D graphs (each child's geometry, materials, and the
// materials' texture properties). The seen-sets guard against shared/cyclic
// references (a material used by two meshes must not be disposed twice, and
// `nodes` records point back into the same graph). The sets are passed IN by
// the caller so a multi-entry clearAsset shares them across entries — a
// resource shared between two cached inputs must not be disposed twice
// either.
function disposeLoadedAsset(
  data: any,
  disposed: Set<any> = new Set(),
  visited: Set<any> = new Set(),
): void {
  if (data == null || typeof data !== "object") return;
  const disposeOnce = (value: any) => {
    if (!value || typeof value !== "object" || disposed.has(value)) return;
    disposed.add(value);
    if (typeof value.dispose === "function") value.dispose();
  };
  // A material's own dispose() does not free the GPU memory of the textures
  // it references, so both the Object3D-traverse path and the plain-wrapper
  // path scan material props for `isTexture` values.
  const disposeMaterial = (material: any) => {
    for (const key in material) {
      const prop = material[key];
      if (prop?.isTexture) disposeOnce(prop);
    }
    disposeOnce(material);
  };
  const visit = (value: any, depth: number) => {
    if (value == null || typeof value !== "object" || visited.has(value)) {
      return;
    }
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value.traverse === "function") {
      value.traverse((child: any) => {
        if (!child || typeof child !== "object" || visited.has(child)) return;
        visited.add(child);
        disposeOnce(child.geometry);
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          if (!material || typeof material !== "object") continue;
          disposeMaterial(material);
        }
      });
    } else {
      if (value.isMaterial) {
        // Material reached outside an Object3D traversal (a plain wrapper's
        // `materials` record): scan its texture props too — see above.
        disposeMaterial(value);
      }
      if (depth < 2) {
        // Plain wrapper: look one/two levels down for the actual graph or
        // dispose-capable members.
        for (const key in value) visit(value[key], depth + 1);
      }
    }
    disposeOnce(value);
  };
  visit(data, 0);
}

function disposeEntry(
  entry: CacheEntry,
  disposed: Set<any>,
  visited: Set<any>,
): void {
  try {
    disposeLoadedAsset(entry.result.data.get(), disposed, visited);
  } catch (error) {
    console.warn("[@domphy/three] clearAsset: dispose failed.", error);
  }
}

/**
 * Evicts cached assets for `LoaderClass` — one `input`, or every input when
 * omitted. The next `loadAsset` for the same key reloads from scratch.
 *
 * Disposal contract (r3f parity): eviction alone does NOT dispose GPU
 * resources. r3f's `clear()` behaves the same way — cached geometries,
 * materials, and textures stay alive, because other scene objects may still
 * reference them. Pass `{ dispose: true }` to opt into disposal of
 * dispose-capable objects reachable from the cached result (the data's own
 * `.dispose()`, plus geometry/material/texture members found by traversing
 * Object3D graphs). Only call it with `dispose: true` when no mounted scene
 * still uses the asset.
 */
export function clearAsset(
  LoaderClass: Constructable,
  input?: string | string[],
  options: ClearAssetOptions = {},
): void {
  if (input === undefined) {
    const byInput = assetCache.get(LoaderClass);
    if (options.dispose && byInput) {
      // One shared pair of guard sets for the whole clear — resources shared
      // BETWEEN cached entries (e.g. two inputs whose graphs reference the
      // same material) must not be disposed twice either.
      const disposed = new Set<any>();
      const visited = new Set<any>();
      byInput.forEach((entry) => disposeEntry(entry, disposed, visited));
    }
    assetCache.delete(LoaderClass);
    return;
  }
  const byInput = assetCache.get(LoaderClass);
  const key = cacheKey(input);
  const entry = byInput?.get(key);
  if (options.dispose && entry) disposeEntry(entry, new Set(), new Set());
  byInput?.delete(key);
}
