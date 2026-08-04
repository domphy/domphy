import { flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAsset, loadAsset, preloadAsset } from "../src/loader.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// A minimal three.js-style Loader: `load(url, onLoad, onProgress, onError)`
// resolving asynchronously (via a microtask), like a real file/network
// loader would. Each call to this factory returns a fresh class so tests
// never share the module-level asset cache with each other.
function createFakeLoaderClass(
  options: {
    onLoadValue?: (url: string) => any;
    shouldFail?: boolean;
    failWith?: unknown;
  } = {},
) {
  const loadCalls: string[] = [];
  const instances: FakeLoader[] = [];

  class FakeLoader {
    constructor() {
      instances.push(this);
    }
    load(
      url: string,
      onLoad: (data: any) => void,
      _onProgress: ((event: ProgressEvent) => void) | undefined,
      onError: (error: unknown) => void,
    ) {
      loadCalls.push(url);
      queueMicrotask(() => {
        if (options.shouldFail) {
          onError(
            options.failWith !== undefined
              ? options.failWith
              : new Error("network error"),
          );
        } else {
          onLoad(options.onLoadValue ? options.onLoadValue(url) : { url });
        }
      });
    }
  }

  return { FakeLoader, loadCalls, instances };
}

describe("loadAsset", () => {
  it("transitions data from null to the loaded value (flushSync)", async () => {
    const { FakeLoader } = createFakeLoaderClass();
    const result = loadAsset(FakeLoader, "model.glb");

    expect(result.data.get()).toBeNull();

    await result.promise;
    flushSync();

    expect(result.data.get()).toEqual({ url: "model.glb" });
    expect(result.error.get()).toBeNull();
  });

  it("populates error on load failure, leaves data null", async () => {
    const { FakeLoader } = createFakeLoaderClass({ shouldFail: true });
    const result = loadAsset(FakeLoader, "missing.glb");

    await expect(result.promise).rejects.toThrow("Could not load missing.glb");
    flushSync();

    expect(result.error.get()).toBeInstanceOf(Error);
    expect(result.data.get()).toBeNull();
  });

  it("resolves array input to an array result", async () => {
    const { FakeLoader } = createFakeLoaderClass();
    const result = loadAsset<{ url: string }[]>(FakeLoader, ["a.glb", "b.glb"]);

    await result.promise;
    flushSync();

    expect(result.data.get()).toEqual([{ url: "a.glb" }, { url: "b.glb" }]);
  });

  it("cache hit returns the same AssetResult and does not reload or reconfigure", async () => {
    const { FakeLoader, loadCalls } = createFakeLoaderClass();
    let configureCalls = 0;
    const configure = () => {
      configureCalls++;
    };

    const first = loadAsset(FakeLoader, "cached.glb", configure);
    const second = loadAsset(FakeLoader, "cached.glb", configure);

    expect(second).toBe(first);
    expect(loadCalls).toEqual(["cached.glb"]);
    expect(configureCalls).toBe(1);

    await first.promise;
  });

  it("different input under the same LoaderClass reuses one loader instance", () => {
    const { FakeLoader, instances } = createFakeLoaderClass();

    loadAsset(FakeLoader, "one.glb");
    loadAsset(FakeLoader, "two.glb");

    expect(instances.length).toBe(1);
  });

  it("configure is invoked with the loader instance", () => {
    const { FakeLoader, instances } = createFakeLoaderClass();
    let receivedLoader: unknown = null;

    loadAsset(FakeLoader, "configured.glb", (loader) => {
      receivedLoader = loader;
    });

    expect(receivedLoader).toBe(instances[0]);
  });

  it("configure runs ONCE per loader instance, not once per cache miss", async () => {
    const { FakeLoader } = createFakeLoaderClass();
    let configureCalls = 0;
    const configure = () => {
      configureCalls++;
    };

    // Different inputs are separate cache misses but share the one loader
    // instance — a non-idempotent configure (plugin registration) must not
    // be re-applied on the same instance.
    const first = loadAsset(FakeLoader, "one.glb", configure);
    const second = loadAsset(FakeLoader, "two.glb", configure);

    expect(configureCalls).toBe(1);
    await Promise.all([first.promise, second.promise]);
  });

  it("configure runs again when the reload uses a NEW loader instance", async () => {
    // A fresh LoaderClass gets a fresh instance, so its configure must run —
    // the guard is per-instance, not per-class-name or global.
    const { FakeLoader: FirstClass } = createFakeLoaderClass();
    const { FakeLoader: SecondClass } = createFakeLoaderClass();
    let configureCalls = 0;
    const configure = () => {
      configureCalls++;
    };

    const first = loadAsset(FirstClass, "same.glb", configure);
    const second = loadAsset(SecondClass, "same.glb", configure);

    expect(configureCalls).toBe(2);
    await Promise.all([first.promise, second.promise]);
  });

  it("wraps load failures with the original error chained as `cause`", async () => {
    const original = new Error("network error");
    const { FakeLoader } = createFakeLoaderClass({
      shouldFail: true,
      failWith: original,
    });
    const result = loadAsset(FakeLoader, "missing.glb");

    const wrapped = await result.promise.catch((loadError: Error) => loadError);
    expect(wrapped.message).toContain("Could not load missing.glb");
    expect((wrapped as Error & { cause?: unknown }).cause).toBe(original);
  });

  it("falls back to String() when the load failure is not an Error (XHR ProgressEvent)", async () => {
    // XHR-based loaders reject with a ProgressEvent — `.message` is
    // undefined, so the wrapped message must come from String() and the
    // original event must still be reachable via `cause`.
    const progressEvent = { type: "error", toString: () => "xhr failed" };
    const { FakeLoader } = createFakeLoaderClass({
      shouldFail: true,
      failWith: progressEvent,
    });
    const result = loadAsset(FakeLoader, "missing.glb");

    const wrapped = await result.promise.catch((loadError: Error) => loadError);
    expect(wrapped.message).toBe("Could not load missing.glb: xhr failed");
    expect((wrapped as Error & { cause?: unknown }).cause).toBe(progressEvent);
  });

  it("gltf-style .scene results get nodes/materials/meshes assigned onto the result", async () => {
    const material = { name: "Mat" };
    const mesh = { name: "Cube", isMesh: true, material };
    const scene = {
      isObject3D: true,
      traverse(visit: (object: any) => void) {
        visit(mesh);
      },
    };
    const { FakeLoader } = createFakeLoaderClass({
      onLoadValue: () => ({ scene }),
    });

    const result = loadAsset<{
      scene: any;
      nodes: Record<string, any>;
      materials: Record<string, any>;
    }>(FakeLoader, "scene.glb");

    await result.promise;
    flushSync();

    const loaded = result.data.get()!;
    expect(loaded.scene).toBe(scene);
    expect(loaded.nodes.Cube).toBe(mesh);
    expect(loaded.materials.Mat).toBe(material);
  });
});

describe("preloadAsset", () => {
  it("warms the cache so a later loadAsset call hits it", async () => {
    const { FakeLoader, loadCalls } = createFakeLoaderClass();

    await preloadAsset(FakeLoader, "warm.glb");
    const result = loadAsset(FakeLoader, "warm.glb");

    await result.promise;
    expect(loadCalls).toEqual(["warm.glb"]);
    expect(result.data.get()).toEqual({ url: "warm.glb" });
  });
});

describe("clearAsset", () => {
  it("evicts a specific input, forcing the next loadAsset to reload", async () => {
    const { FakeLoader, loadCalls } = createFakeLoaderClass();

    const first = loadAsset(FakeLoader, "evict.glb");
    await first.promise;

    clearAsset(FakeLoader, "evict.glb");
    const second = loadAsset(FakeLoader, "evict.glb");

    expect(second).not.toBe(first);
    expect(loadCalls).toEqual(["evict.glb", "evict.glb"]);
    await second.promise;
  });

  it("with no input clears every cached entry for that LoaderClass", async () => {
    const { FakeLoader, loadCalls } = createFakeLoaderClass();

    const first = loadAsset(FakeLoader, "a.glb");
    const other = loadAsset(FakeLoader, "b.glb");
    await Promise.all([first.promise, other.promise]);

    clearAsset(FakeLoader);

    const reloadedFirst = loadAsset(FakeLoader, "a.glb");
    const reloadedOther = loadAsset(FakeLoader, "b.glb");

    expect(reloadedFirst).not.toBe(first);
    expect(reloadedOther).not.toBe(other);
    expect(loadCalls).toEqual(["a.glb", "b.glb", "a.glb", "b.glb"]);
    await Promise.all([reloadedFirst.promise, reloadedOther.promise]);
  });
});

describe("loadAsset configure on cache hit", () => {
  it("warns once in dev when a cache hit passes a DIFFERENT configure", async () => {
    const { FakeLoader } = createFakeLoaderClass();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = loadAsset(FakeLoader, "cfg.glb", () => {});
    // A fresh function reference per call site — silently ignored before.
    const second = loadAsset(FakeLoader, "cfg.glb", () => {});

    expect(second).toBe(first);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("configure");

    // A third distinct configure still produces only the one warning.
    loadAsset(FakeLoader, "cfg.glb", () => {});
    expect(warn).toHaveBeenCalledTimes(1);

    await first.promise;
  });

  it("does not warn when the cache hit passes the SAME configure reference", async () => {
    const { FakeLoader } = createFakeLoaderClass();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const configure = () => {};

    const first = loadAsset(FakeLoader, "same-cfg.glb", configure);
    const second = loadAsset(FakeLoader, "same-cfg.glb", configure);

    expect(second).toBe(first);
    expect(warn).not.toHaveBeenCalled();

    await first.promise;
  });
});

describe("clearAsset dispose option", () => {
  function createDisposableScene() {
    const texture = { isTexture: true, dispose: vi.fn() };
    const material = { name: "Mat", map: texture, dispose: vi.fn() };
    const geometry = { dispose: vi.fn() };
    const mesh = { name: "Cube", isMesh: true, geometry, material };
    const scene = {
      isObject3D: true,
      traverse(visit: (object: any) => void) {
        visit(mesh);
      },
    };
    return { scene, texture, material, geometry };
  }

  it("does NOT dispose by default (r3f parity — eviction only)", async () => {
    const { scene, texture, material, geometry } = createDisposableScene();
    const { FakeLoader } = createFakeLoaderClass({
      onLoadValue: () => ({ scene }),
    });

    const result = loadAsset(FakeLoader, "keep.glb");
    await result.promise;
    flushSync();

    clearAsset(FakeLoader, "keep.glb");

    expect(texture.dispose).not.toHaveBeenCalled();
    expect(material.dispose).not.toHaveBeenCalled();
    expect(geometry.dispose).not.toHaveBeenCalled();
  });

  it("with { dispose: true } disposes geometry, materials, and textures on the cached graph", async () => {
    const { scene, texture, material, geometry } = createDisposableScene();
    const { FakeLoader } = createFakeLoaderClass({
      onLoadValue: () => ({ scene }),
    });

    const result = loadAsset(FakeLoader, "purge.glb");
    await result.promise;
    flushSync();

    clearAsset(FakeLoader, "purge.glb", { dispose: true });

    expect(geometry.dispose).toHaveBeenCalledTimes(1);
    expect(material.dispose).toHaveBeenCalledTimes(1);
    expect(texture.dispose).toHaveBeenCalledTimes(1);
  });

  it("with { dispose: true } and no input disposes every cached entry for the class", async () => {
    const first = createDisposableScene();
    const second = createDisposableScene();
    const { FakeLoader } = createFakeLoaderClass({
      onLoadValue: (url) =>
        url === "a.glb" ? { scene: first.scene } : { scene: second.scene },
    });

    const resultA = loadAsset(FakeLoader, "a.glb");
    const resultB = loadAsset(FakeLoader, "b.glb");
    await Promise.all([resultA.promise, resultB.promise]);
    flushSync();

    clearAsset(FakeLoader, undefined, { dispose: true });

    expect(first.geometry.dispose).toHaveBeenCalledTimes(1);
    expect(second.geometry.dispose).toHaveBeenCalledTimes(1);
  });

  it("with { dispose: true } disposes a directly dispose-capable result (e.g. a texture)", async () => {
    const texture = { isTexture: true, dispose: vi.fn() };
    const { FakeLoader } = createFakeLoaderClass({
      onLoadValue: () => texture,
    });

    const result = loadAsset(FakeLoader, "tex.png");
    await result.promise;
    flushSync();

    clearAsset(FakeLoader, "tex.png", { dispose: true });

    expect(texture.dispose).toHaveBeenCalledTimes(1);
  });

  it("with { dispose: true } and no input disposes a resource shared BETWEEN entries exactly once", async () => {
    // Two cached inputs whose graphs reference the same material — the
    // guard sets must be shared across the whole clear, not rebuilt per
    // entry, or the shared material would be disposed twice.
    const sharedMaterial = { isMaterial: true, dispose: vi.fn() };
    const { FakeLoader } = createFakeLoaderClass({
      onLoadValue: (url) => ({ materials: { [url]: sharedMaterial } }),
    });

    const resultA = loadAsset(FakeLoader, "a.glb");
    const resultB = loadAsset(FakeLoader, "b.glb");
    await Promise.all([resultA.promise, resultB.promise]);
    flushSync();

    clearAsset(FakeLoader, undefined, { dispose: true });

    expect(sharedMaterial.dispose).toHaveBeenCalledTimes(1);
  });

  it("with { dispose: true } scans texture props of materials on the plain-wrapper path", async () => {
    // A material reachable through a plain wrapper (gltf's `materials`
    // record, not an Object3D traversal) owns textures whose GPU memory its
    // own dispose() does not free.
    const texture = { isTexture: true, dispose: vi.fn() };
    const material = { isMaterial: true, map: texture, dispose: vi.fn() };
    const { FakeLoader } = createFakeLoaderClass({
      onLoadValue: () => ({ materials: { Mat: material } }),
    });

    const result = loadAsset(FakeLoader, "wrapped.glb");
    await result.promise;
    flushSync();

    clearAsset(FakeLoader, "wrapped.glb", { dispose: true });

    expect(material.dispose).toHaveBeenCalledTimes(1);
    expect(texture.dispose).toHaveBeenCalledTimes(1);
  });
});
