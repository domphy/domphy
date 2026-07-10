import { flushSync } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { clearAsset, loadAsset, preloadAsset } from "../src/loader.js";

// A minimal three.js-style Loader: `load(url, onLoad, onProgress, onError)`
// resolving asynchronously (via a microtask), like a real file/network
// loader would. Each call to this factory returns a fresh class so tests
// never share the module-level asset cache with each other.
function createFakeLoaderClass(
  options: { onLoadValue?: (url: string) => any; shouldFail?: boolean } = {},
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
          onError(new Error("network error"));
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
