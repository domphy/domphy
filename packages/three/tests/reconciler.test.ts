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
    // Real push/unregister against internal.frameCallbacks (mirroring
    // loop.ts's registerFrameCallback) instead of a no-op — tests assert on
    // onFrame registrations being released.
    frame: (callback, priority = 0) => {
      const entry = { callback, priority };
      internal.frameCallbacks.push(entry);
      if (priority > 0) internal.priorityCount += 1;
      internal.subscribersDirty = true;
      return () => {
        const index = internal.frameCallbacks.indexOf(entry);
        if (index === -1) return;
        internal.frameCallbacks.splice(index, 1);
        if (priority > 0) internal.priorityCount -= 1;
      };
    },
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

  it("throws a clear error for a nested-array child instead of the cryptic namespace error", () => {
    expect(() =>
      reconcileChildren(
        rootNode,
        [
          { ambientLight: null, intensity: 0.5 },
          [
            { mesh: null, _key: "a" },
            { mesh: null, _key: "b" },
          ] as any,
        ],
        root,
      ),
    ).toThrow(
      "@domphy/three: scene children must be description objects keyed by tag — got a nested array. Spread it into the parent array instead (e.g. [...children, ...mapped]).",
    );
  });

  it("throws a clear error for a non-object child (string, number, ...)", () => {
    expect(() => reconcileChildren(rootNode, ["hello" as any], root)).toThrow(
      '@domphy/three: scene children must be description objects keyed by tag — got "hello".',
    );
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

// Regression: reconcileChildren used to iterate `oldChildren` — a live alias
// of `node.children` — while disposeSceneNode splices the disposed node out
// of that very array, skipping every second removed child.
describe("reconciler — removal disposes every unclaimed child", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    root = createTestRoot();
    rootNode = createRootNode(root);
  });

  it("disposes ALL children and detaches their instances when reconciling to []", () => {
    reconcileChildren(
      rootNode,
      [
        { mesh: null, _key: "a" },
        { mesh: null, _key: "b" },
        { mesh: null, _key: "c" },
      ],
      root,
    );

    const removedNodes = rootNode.children.slice();
    // three's Mesh has no own dispose() — stub one per instance so the
    // dispose pass is observable (disposeOnIdle only calls functions).
    const disposeSpies = removedNodes.map((child) => {
      const spy = vi.fn();
      child.instance.dispose = spy;
      return spy;
    });

    reconcileChildren(rootNode, [], root);

    expect(rootNode.children).toHaveLength(0);
    expect(root.scene.children).toHaveLength(0);
    for (const removed of removedNodes) {
      expect(removed.disposed).toBe(true);
    }
    for (const spy of disposeSpies) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });
});

// Regression: the reconstruct paths used to assign the NEW props bag onto
// `node.props` BEFORE applyProps ran, so applyProps diffed removed keys
// against the new bag itself and never unwound them — a dropped `onFrame`
// kept firing on the disposed instance.
describe("reconciler — reconstruct unwinds removed props", () => {
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

  it("releases onFrame when a patchSceneNode args-reconstruct drops it from the bag", () => {
    reconcileChildren(
      rootNode,
      [{ sizedGroup: null, args: [1], onFrame: () => {} }],
      root,
    );
    const node = rootNode.children[0];
    expect(root.internal.frameCallbacks).toHaveLength(1);

    patchSceneNode(node, { sizedGroup: null, args: [2] }, root);

    expect(root.internal.frameCallbacks).toHaveLength(0);
    expect(node.props.onFrame).toBeUndefined();
  });

  it("releases onFrame when a reconcileChildren two-phase reconstruct drops it from the bag", () => {
    reconcileChildren(
      rootNode,
      [{ sizedGroup: null, args: [1], onFrame: () => {}, _key: "a" }],
      root,
    );
    expect(root.internal.frameCallbacks).toHaveLength(1);

    reconcileChildren(
      rootNode,
      [{ sizedGroup: null, args: [2], _key: "a" }],
      root,
    );

    expect(root.internal.frameCallbacks).toHaveLength(0);
  });

  it("reactive-args reconstructs still apply the last-applied props bag", () => {
    const size = toState(1);
    reconcileChildren(
      rootNode,
      [
        {
          sizedGroup: null,
          args: (listener: any) => [size.get(listener)],
          "userData-tag": "kept",
        },
      ],
      root,
    );
    const node = rootNode.children[0];

    size.set(2);
    flushSync();

    expect(node.instance.size).toBe(2);
    // The reconstruct must re-apply the node's existing props onto the new
    // instance, not lose them.
    expect(node.instance.userData.tag).toBe("kept");
  });
});

// Regression: the reconstruct dispose decision used the autoDispose value
// frozen at node creation, so a patch adding `dispose: null` alongside new
// args still disposed the old instance.
describe("reconciler — reconstruct honors a newly-added dispose: null", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    root = createTestRoot();
    rootNode = createRootNode(root);
  });

  it("does NOT dispose the old instance when the reconstructing patch adds dispose: null", () => {
    reconcileChildren(
      rootNode,
      [{ mesh: [{ boxGeometry: null, args: [1] }] }],
      root,
    );
    const geometryNode = rootNode.children[0].children[0];
    const oldInstance = geometryNode.instance;
    const disposeSpy = vi.spyOn(oldInstance, "dispose");

    patchSceneNode(
      geometryNode,
      { boxGeometry: null, args: [2], dispose: null },
      root,
    );

    expect(geometryNode.instance).not.toBe(oldInstance);
    expect(disposeSpy).not.toHaveBeenCalled();
    expect(geometryNode.autoDispose).toBe(false);
  });

  it("still disposes the old instance when the reconstructing patch does not opt out", () => {
    reconcileChildren(
      rootNode,
      [{ mesh: [{ boxGeometry: null, args: [1] }] }],
      root,
    );
    const geometryNode = rootNode.children[0].children[0];
    const oldInstance = geometryNode.instance;
    const disposeSpy = vi.spyOn(oldInstance, "dispose");

    patchSceneNode(geometryNode, { boxGeometry: null, args: [2] }, root);

    expect(geometryNode.instance).not.toBe(oldInstance);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
    expect(geometryNode.autoDispose).toBe(true);
  });
});

// Regression: a props-only patch (no args/object change) never invalidated
// the root, so a demand-mode frameloop never re-rendered the change.
describe("reconciler — props-only patch invalidates", () => {
  let root: RootState;
  let rootNode: SceneNode;

  beforeEach(() => {
    extend({ SizedGroup });
    root = createTestRoot();
    root.frameloop = "demand";
    rootNode = createRootNode(root);
  });

  afterEach(() => {
    clearRegistry();
  });

  it("invalidates after patchSceneNode re-applies props without reconstructing", () => {
    reconcileChildren(rootNode, [{ mesh: null }], root);
    const node = rootNode.children[0];
    (root.invalidate as ReturnType<typeof vi.fn>).mockClear();

    patchSceneNode(node, { mesh: null, "rotation-z": 1 }, root);

    expect(root.invalidate).toHaveBeenCalled();
    expect(node.instance.rotation.z).toBe(1);
  });

  it("invalidates after reconcileChildren re-applies props without reconstructing", () => {
    reconcileChildren(
      rootNode,
      [{ sizedGroup: null, args: [1], _key: "a" }],
      root,
    );
    (root.invalidate as ReturnType<typeof vi.fn>).mockClear();

    reconcileChildren(
      rootNode,
      [{ sizedGroup: null, args: [1], _key: "a", "rotation-z": 1 }],
      root,
    );

    expect(root.invalidate).toHaveBeenCalled();
    expect(rootNode.children[0].instance.rotation.z).toBe(1);
  });
});

// Regression: a failed createSceneNode leaked whatever it had already set up
// — the reactive-args subscription when instantiate threw, and a ghost
// instance attached to the parent when child reconciliation threw after
// attach.
describe("reconciler — createSceneNode error unwinding", () => {
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

  it("releases the reactive-args binding when instantiate throws (unregistered tag)", () => {
    const size = toState(1);
    const argsFn = vi.fn((listener: any) => [size.get(listener)]);

    expect(() =>
      createSceneNode(
        { unregisteredThing: null, args: argsFn } as any,
        rootNode,
        root,
      ),
    ).toThrow(
      '@domphy/three: "unregisteredThing" is not part of the THREE namespace!',
    );

    // The binding must be gone: mutating the state must not re-fire it.
    const callsAfterThrow = argsFn.mock.calls.length;
    size.set(2);
    flushSync();
    expect(argsFn.mock.calls.length).toBe(callsAfterThrow);
  });

  it("detaches and unwinds a primitive whose child reconciliation throws after attach", () => {
    const object = new THREE.Group();

    expect(() =>
      createSceneNode(
        { primitive: ["bad-child" as any], object },
        rootNode,
        root,
      ),
    ).toThrow(
      "@domphy/three: scene children must be description objects keyed by tag",
    );

    expect(root.scene.children).not.toContain(object);
    expect((object as any).__domphy).toBeUndefined();
  });

  it("detaches and disposes a non-primitive whose child reconciliation throws after attach", () => {
    let captured: SizedGroup | null = null;
    class CapturingGroup extends SizedGroup {
      constructor() {
        super(1);
        captured = this as SizedGroup;
      }
    }
    extend({ CapturingGroup });
    const disposeSpy = vi.fn();
    (CapturingGroup.prototype as any).dispose = disposeSpy;

    expect(() =>
      createSceneNode({ capturingGroup: ["bad-child" as any] }, rootNode, root),
    ).toThrow(
      "@domphy/three: scene children must be description objects keyed by tag",
    );

    expect(captured).not.toBeNull();
    expect(root.scene.children).not.toContain(captured);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});
