import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { loadAsset } from "../src/loader.js";
import { three } from "../src/patch.js";
import type { RootState } from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

// jsdom has no ResizeObserver — three()'s _onMount wires one up unconditionally,
// so every test here that mounts through three() needs a no-op stub in place.
// Vitest isolates each test file's module registry, so this is not shared with
// patch.test.ts's own stub.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as any).ResizeObserver = ResizeObserverStub;

function mount(element: DomphyElement): {
  host: HTMLElement;
  node: ElementNode;
} {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(element);
  node.render(host);
  return { host, node };
}

// Port of react-three-fiber's `fiber/tests/hooks.test.tsx` — the `useLoader`
// cases only (per the task: other hooks in that file — useThree, useFrame,
// useGraph, useInstanceHandle, the React-19 no-crash smoke test — are
// React-specific and out of scope for this port; see tests/PORT-NOTES.md
// (hooks.test.tsx section)).
//
// Domphy has no Suspense analog: `useLoader`'s suspend-until-loaded semantics
// become `loadAsset`'s `AssetResult` (a plain `State<T | null>`, see
// loader.ts). The scene-graph half of each case (the loaded object ending up
// in `scene.children`) is reproduced by driving a `three()` scene function
// that reads `result.data.get(l)` and renders a `{ primitive, object }` once
// the asset resolves — falsy scene children are skipped (SPEC.md), so before
// resolution the scene renders nothing.
describe("loadAsset — useLoader acceptance", () => {
  it("resolves an asset and renders it into the scene via a primitive", async () => {
    interface GLTF {
      scene: any;
      nodes: Record<string, any>;
    }

    const MockMesh = new THREE.Mesh();
    MockMesh.name = "Scene";

    class GLTFLoader extends THREE.Loader {
      load(_url: string, onLoad: (gltf: GLTF) => void): void {
        onLoad({ scene: MockMesh } as GLTF);
      }
    }

    const result = loadAsset<GLTF>(GLTFLoader, "/suzanne.glb");
    let capturedRoot: RootState | undefined;

    mount({
      div: null,
      $: [
        three({
          scene: (l) => {
            const gltf = result.data.get(l);
            return gltf ? [{ primitive: null, object: gltf.scene }] : null;
          },
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    expect(capturedRoot!.scene.children).toHaveLength(0);

    await result.promise;
    flushSync();

    expect(capturedRoot!.scene.children[0]).toBe(MockMesh);
    const gltf = result.data.get()!;
    expect(gltf.scene).toBe(MockMesh);
    expect(gltf.nodes.Scene).toBe(MockMesh);
  });

  it("resolves an array of urls in order and renders each result into the scene", async () => {
    const MockMesh = new THREE.Mesh();

    const MockGroup = new THREE.Group();
    const mat1 = new THREE.MeshBasicMaterial();
    mat1.name = "Mat 1";
    const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat1);
    mesh1.name = "Mesh 1";
    const mat2 = new THREE.MeshBasicMaterial();
    mat2.name = "Mat 2";
    const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat2);
    mesh2.name = "Mesh 2";
    MockGroup.add(mesh1, mesh2);

    class TestLoader extends THREE.Loader {
      load = vi
        .fn()
        .mockImplementationOnce((_url: string, onLoad: (data: any) => void) => {
          onLoad(MockMesh);
        })
        .mockImplementationOnce((_url: string, onLoad: (data: any) => void) => {
          onLoad(MockGroup);
        });
    }

    const configure = vi.fn();
    const result = loadAsset<any[]>(
      TestLoader,
      ["/suzanne.glb", "/myModels.glb"],
      configure,
    );
    let capturedRoot: RootState | undefined;

    mount({
      div: null,
      $: [
        three({
          scene: (l) => {
            const models = result.data.get(l);
            return models
              ? models.map((object: any) => ({ primitive: null, object }))
              : null;
          },
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    await result.promise;
    flushSync();

    expect(capturedRoot!.scene.children[0]).toBe(MockMesh);
    expect(capturedRoot!.scene.children[1]).toBe(MockGroup);
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it("instantiates a loader class once and invokes configure with that instance", async () => {
    class SimpleLoader extends THREE.Loader {
      load(_url: string, onLoad: (result: null) => void): void {
        onLoad(null);
      }
    }

    let proto: SimpleLoader | undefined;
    const result = loadAsset(SimpleLoader, "", (loader) => {
      proto = loader;
    });

    await result.promise;

    expect(proto).toBeInstanceOf(SimpleLoader);
  });
});
