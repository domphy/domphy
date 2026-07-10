import { flushSync, State, toState } from "@domphy/core";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRegistry, extend } from "../src/catalog.js";
import {
  createSceneNode,
  disposeSceneNode,
  patchSceneNode,
  reconcileChildren,
} from "../src/reconciler.js";
import type {
  RootInternal,
  RootState,
  SceneNode,
  SizeState,
} from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

// A tiny Object3D subclass taking a constructor arg, registered through
// extend() — used to exercise "args change -> reconstruct" on a node that
// also owns Object3D children (three's built-in classes with numeric args,
// like BoxGeometry, aren't Object3D and can't carry children).
class SizedGroup extends THREE.Object3D {
  size: number;
  constructor(size = 1) {
    super();
    this.size = size;
  }
}

// Hand-built minimal RootState (rootState.ts is out of scope for this
// module's tests — see SPEC.md's testing guidance).
function createTestRoot(): RootState {
  const internal: RootInternal = {
    frameCallbacks: [],
    priorityCount: 0,
    interactive: [],
    captured: new Map(),
    initialClick: [0, 0],
    initialHits: [],
    hovered: new Map(),
    lastEvent: null,
    active: true,
    frames: 0,
    subscribersDirty: false,
  };

  const size = new State<SizeState>({ width: 300, height: 150, dpr: 1 });
  const scene = new THREE.Scene();

  const root: RootState = {
    gl: createStubRenderer(),
    scene,
    camera: new THREE.PerspectiveCamera(),
    canvas: document.createElement("canvas"),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    clock: new THREE.Clock(),
    frameloop: "always",
    size,
    invalidate: vi.fn(),
    advance: vi.fn(),
    frame: () => () => {},
    setFrameloop: vi.fn(),
    internal,
  };

  return root;
}

// A "scene" wrapper SceneNode, the same shape patch.ts will build to give
// reconcileChildren a real Object3D container (root.scene) to mount into.
function createRootNode(root: RootState): SceneNode {
  return {
    tag: "scene",
    instance: root.scene,
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

describe("reconciler — createSceneNode", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    root = createTestRoot();
    rootNode = createRootNode(root);
  });

  it("builds a mesh+geometry+material tree with real three instances wired up", () => {
    reconcileChildren(
      rootNode,
      [
        {
          mesh: [
            { boxGeometry: null, args: [1, 1, 1] },
            { meshBasicMaterial: null, color: "#ff0000" },
          ],
        },
      ],
      root,
    );

    const meshNode = rootNode.children[0];
    expect(meshNode.instance).toBeInstanceOf(THREE.Mesh);
    expect(meshNode.instance.geometry).toBeInstanceOf(THREE.BoxGeometry);
    expect(meshNode.instance.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(meshNode.instance.material.color).toEqual(
      new THREE.Color("#ff0000"),
    );
    expect(root.scene.children).toContain(meshNode.instance);
    expect(meshNode.instance.geometry.__domphy).toBe(meshNode.children[0]);
  });

  it("adopts a primitive's existing object without constructing a new one", () => {
    const existing = new THREE.Group();
    reconcileChildren(rootNode, [{ primitive: null, object: existing }], root);

    const node = rootNode.children[0];
    expect(node.instance).toBe(existing);
    expect(node.isPrimitive).toBe(true);
    expect(root.scene.children).toContain(existing);
  });
});

describe("reconciler — reconcileChildren keyed reorder", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    root = createTestRoot();
    rootNode = createRootNode(root);
  });

  it("preserves node/instance identity across a keyed reorder and updates instance order", () => {
    reconcileChildren(
      rootNode,
      [
        { mesh: null, _key: "a" },
        { mesh: null, _key: "b" },
      ],
      root,
    );

    const [nodeA, nodeB] = rootNode.children;
    const instanceA = nodeA.instance;
    const instanceB = nodeB.instance;

    reconcileChildren(
      rootNode,
      [
        { mesh: null, _key: "b" },
        { mesh: null, _key: "a" },
      ],
      root,
    );

    expect(rootNode.children[0]).toBe(nodeB);
    expect(rootNode.children[1]).toBe(nodeA);
    expect(rootNode.children[0].instance).toBe(instanceB);
    expect(rootNode.children[1].instance).toBe(instanceA);
    expect(root.scene.children[0]).toBe(instanceB);
    expect(root.scene.children[1]).toBe(instanceA);
  });
});

describe("reconciler — args change reconstructs", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    extend({ SizedGroup });
    root = createTestRoot();
    rootNode = createRootNode(root);
  });

  afterEach(() => {
    clearRegistry();
  });

  it("reconstructs the instance on an args change, keeping child instances", () => {
    reconcileChildren(
      rootNode,
      [{ sizedGroup: [{ mesh: null, _key: "child" }], args: [1] }],
      root,
    );

    const groupNode = rootNode.children[0];
    const originalGroupInstance = groupNode.instance;
    const originalChildInstance = groupNode.children[0].instance;

    patchSceneNode(
      groupNode,
      { sizedGroup: [{ mesh: null, _key: "child" }], args: [2] },
      root,
    );

    expect(groupNode.instance).not.toBe(originalGroupInstance);
    expect(groupNode.instance.size).toBe(2);
    expect(groupNode.children[0].instance).toBe(originalChildInstance);
    expect(groupNode.instance.children).toContain(originalChildInstance);
    expect(root.scene.children).toContain(groupNode.instance);
    expect(root.scene.children).not.toContain(originalGroupInstance);
  });

  it("does not reconstruct when args are unchanged", () => {
    reconcileChildren(rootNode, [{ sizedGroup: null, args: [1] }], root);
    const groupNode = rootNode.children[0];
    const originalInstance = groupNode.instance;

    patchSceneNode(groupNode, { sizedGroup: null, args: [1] }, root);

    expect(groupNode.instance).toBe(originalInstance);
  });

  // Regression for the two-phase `pendingReconstructs` pass in
  // reconcileChildren (r3f #3125/#3143): reconstructing 2+ SIBLINGS in the
  // SAME reconcile call must not let one sibling's attach clobber the
  // other's __domphy backref/parent link before its own turn runs. This
  // exercises reconcileChildren directly (not patchSceneNode on a single
  // already-created node), which is the only path that hits the two-phase
  // split at all.
  it("reconstructs 2+ sibling nodes whose args change within the SAME reconcileChildren call without cross-clobbering", () => {
    reconcileChildren(
      rootNode,
      [
        { sizedGroup: null, args: [1], _key: "a" },
        { sizedGroup: null, args: [10], _key: "b" },
      ],
      root,
    );

    const [nodeA, nodeB] = rootNode.children;
    const originalInstanceA = nodeA.instance;
    const originalInstanceB = nodeB.instance;

    reconcileChildren(
      rootNode,
      [
        { sizedGroup: null, args: [2], _key: "a" },
        { sizedGroup: null, args: [20], _key: "b" },
      ],
      root,
    );

    expect(rootNode.children[0]).toBe(nodeA);
    expect(rootNode.children[1]).toBe(nodeB);
    expect(nodeA.instance).not.toBe(originalInstanceA);
    expect(nodeB.instance).not.toBe(originalInstanceB);
    expect(nodeA.instance.size).toBe(2);
    expect(nodeB.instance.size).toBe(20);
    expect(nodeA.instance.__domphy).toBe(nodeA);
    expect(nodeB.instance.__domphy).toBe(nodeB);
    expect(root.scene.children).toContain(nodeA.instance);
    expect(root.scene.children).toContain(nodeB.instance);
    expect(root.scene.children).not.toContain(originalInstanceA);
    expect(root.scene.children).not.toContain(originalInstanceB);
  });
});

describe("reconciler — dispose semantics", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    root = createTestRoot();
    rootNode = createRootNode(root);
  });

  it("does not dispose an adopted primitive on removal", () => {
    const existing = new THREE.Group();
    (existing as any).dispose = vi.fn();
    reconcileChildren(rootNode, [{ primitive: null, object: existing }], root);

    const node = rootNode.children[0];
    disposeSceneNode(node);

    expect((existing as any).dispose).not.toHaveBeenCalled();
    expect(root.scene.children).not.toContain(existing);
  });

  it("respects dispose: null and does not dispose the instance on removal", () => {
    reconcileChildren(rootNode, [{ mesh: null, dispose: null }], root);
    const node = rootNode.children[0];
    const disposeSpy = vi.fn();
    node.instance.dispose = disposeSpy;

    disposeSceneNode(node);

    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it("cascades dispose: null onto descendants that do not declare their OWN dispose: null", () => {
    // SPEC.md: "dispose: null opts a node's SUBTREE out of auto-dispose".
    // The mesh's children (geometry/material) don't set `dispose: null`
    // themselves — the ancestor's flag must still suppress their disposal.
    reconcileChildren(
      rootNode,
      [
        {
          mesh: [
            { boxGeometry: null, args: [1, 1, 1] },
            { meshBasicMaterial: null },
          ],
          dispose: null,
        },
      ],
      root,
    );

    const meshNode = rootNode.children[0];
    const geometryDisposeSpy = vi.spyOn(
      meshNode.children[0].instance,
      "dispose",
    );
    const materialDisposeSpy = vi.spyOn(
      meshNode.children[1].instance,
      "dispose",
    );

    disposeSceneNode(meshNode);

    expect(geometryDisposeSpy).not.toHaveBeenCalled();
    expect(materialDisposeSpy).not.toHaveBeenCalled();
  });

  it("disposes attached geometry/material and releases reactive subscriptions on removal", () => {
    reconcileChildren(
      rootNode,
      [
        {
          mesh: [
            { boxGeometry: null, args: [1, 1, 1] },
            { meshBasicMaterial: null },
          ],
        },
      ],
      root,
    );

    const meshNode = rootNode.children[0];
    const geometryInstance = meshNode.children[0].instance;
    const materialInstance = meshNode.children[1].instance;
    const geometryDisposeSpy = vi.spyOn(geometryInstance, "dispose");
    const materialDisposeSpy = vi.spyOn(materialInstance, "dispose");

    const spin = toState(0);
    patchSceneNode(
      meshNode,
      {
        mesh: [
          { boxGeometry: null, args: [1, 1, 1] },
          { meshBasicMaterial: null },
        ],
        "rotation-z": (listener: any) => spin.get(listener),
      },
      root,
    );
    expect(meshNode.instance.rotation.z).toBe(0);

    disposeSceneNode(meshNode);

    expect(geometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(materialDisposeSpy).toHaveBeenCalledTimes(1);
    expect(root.scene.children).not.toContain(meshNode.instance);

    spin.set(5);
    flushSync();
    expect(meshNode.instance.rotation.z).toBe(0); // released — no longer subscribed
  });
});

describe("reconciler — reactive children (SceneFunction)", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    root = createTestRoot();
    rootNode = createRootNode(root);
  });

  it("adds and removes children reactively via a State-driven scene function", () => {
    const ids = toState(["a", "b"]);

    const groupNode = createSceneNode(
      {
        group: (listener: any) =>
          ids.get(listener).map((id: string) => ({ mesh: null, _key: id })),
      },
      rootNode,
      root,
    );

    expect(groupNode.children).toHaveLength(2);
    const [nodeA, nodeB] = groupNode.children;
    const instanceA = nodeA.instance;
    expect(groupNode.instance.children).toEqual([instanceA, nodeB.instance]);

    ids.set(["a", "c"]);
    flushSync();

    expect(groupNode.children).toHaveLength(2);
    expect(groupNode.children[0]).toBe(nodeA); // "a" preserved by key
    expect(groupNode.children[0].instance).toBe(instanceA);
    expect(groupNode.children[1].key).toBe("c");
    expect(groupNode.instance.children).toContain(instanceA);
    expect(groupNode.instance.children).not.toContain(nodeB.instance);
    expect(groupNode.instance.children).toHaveLength(2);
  });
});
