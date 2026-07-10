import { flushSync, State, toState } from "@domphy/core";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyProps,
  attach,
  detach,
  POINTER_EVENT_KEYS,
  resolvePath,
} from "../src/props.js";
import type {
  RootInternal,
  RootState,
  SceneNode,
  SizeState,
} from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

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

  const root: RootState = {
    gl: createStubRenderer(),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    canvas: document.createElement("canvas"),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    clock: new THREE.Clock(),
    frameloop: "always",
    size,
    invalidate: vi.fn(),
    advance: vi.fn(),
    frame: (callback, priority = 0) => {
      const entry = { callback, priority };
      internal.frameCallbacks.push(entry);
      if (priority > 0) internal.priorityCount++;
      return () => {
        const index = internal.frameCallbacks.indexOf(entry);
        if (index > -1) internal.frameCallbacks.splice(index, 1);
        if (priority > 0) internal.priorityCount--;
      };
    },
    setFrameloop: vi.fn(),
    internal,
  };

  return root;
}

function createNode(
  instance: any,
  root: RootState,
  parent: SceneNode | null = null,
): SceneNode {
  return {
    tag: instance?.type ?? "test",
    instance,
    root,
    parent,
    children: [],
    key: null,
    props: {},
    attach: null,
    previousAttach: undefined,
    isPrimitive: false,
    autoDispose: true,
    releases: [],
    disposed: false,
  };
}

describe("applyProps — static duck-typed values", () => {
  let root: RootState;

  beforeEach(() => {
    root = createTestRoot();
  });

  it("applies an array prop via .set (position)", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);

    applyProps(node, { position: [1, 2, 3] });

    expect(instance.position).toEqual(new THREE.Vector3(1, 2, 3));
  });

  it("applies a scalar prop via .setScalar (uniform scale)", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);

    applyProps(node, { scale: 5 });

    expect(instance.scale).toEqual(new THREE.Vector3(5, 5, 5));
  });

  it("applies a color string via Color.set", () => {
    const instance = new THREE.MeshBasicMaterial();
    const node = createNode(instance, root);

    applyProps(node, { color: "#ff0000" });

    expect(instance.color).toEqual(new THREE.Color("#ff0000"));
  });

  it("resolves a nested pierced prop path (material-color)", () => {
    const instance = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial());
    const node = createNode(instance, root);

    applyProps(node, { "material-color": "#00ff00" });

    expect((instance.material as THREE.MeshBasicMaterial).color).toEqual(
      new THREE.Color("#00ff00"),
    );
  });

  it("copies a same-constructor value via .copy", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);

    applyProps(node, { position: new THREE.Vector3(4, 5, 6) });

    expect(instance.position).toEqual(new THREE.Vector3(4, 5, 6));
  });

  it("ignores undefined prop values", () => {
    const instance = new THREE.Mesh();
    instance.position.set(1, 1, 1);
    const node = createNode(instance, root);

    applyProps(node, { position: undefined });

    expect(instance.position).toEqual(new THREE.Vector3(1, 1, 1));
  });

  it("excludes args from instance assignment but keeps it on node.props", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);

    applyProps(node, { args: [1, 2, 3], position: [0, 1, 0] });

    expect((instance as any).args).toBeUndefined();
    expect(node.props.args).toEqual([1, 2, 3]);
  });

  it("calls onUpdate after all other props have been applied", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);
    const onUpdate = vi.fn((self: any) => {
      expect(self.position.x).toBe(1);
    });

    applyProps(node, { position: [1, 2, 3], onUpdate });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(instance);
  });

  it("infers attach from isBufferGeometry/isMaterial/isFog when not declared", () => {
    const geometryNode = createNode(new THREE.BoxGeometry(), root);
    applyProps(geometryNode, {});
    expect(geometryNode.props.attach).toBe("geometry");

    const materialNode = createNode(new THREE.MeshBasicMaterial(), root);
    applyProps(materialNode, {});
    expect(materialNode.props.attach).toBe("material");

    const fogNode = createNode(new THREE.Fog(0xffffff), root);
    applyProps(fogNode, {});
    expect(fogNode.props.attach).toBe("fog");
  });

  it("does not override an explicitly declared attach", () => {
    const node = createNode(new THREE.BoxGeometry(), root);
    applyProps(node, { attach: "geometry-attributes-position" });
    expect(node.props.attach).toBe("geometry-attributes-position");
  });

  it("merges ShaderMaterial uniforms in place instead of replacing the whole object", () => {
    const instance = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(1, 0, 0) },
      },
    });
    const originalUniforms = instance.uniforms;
    const originalTimeUniform = instance.uniforms.time;
    const node = createNode(instance, root);

    applyProps(node, { uniforms: { time: { value: 1 } } });

    // Same top-level `uniforms` object AND the same `time` sub-object — a
    // compiled WebGLProgram holding a reference to either must still see
    // the update, not a disconnected replacement.
    expect(instance.uniforms).toBe(originalUniforms);
    expect(instance.uniforms.time).toBe(originalTimeUniform);
    expect(instance.uniforms.time.value).toBe(1);
    // Untouched uniforms are preserved, not dropped by the merge.
    expect(instance.uniforms.color.value).toEqual(new THREE.Color(1, 0, 0));
  });

  it("adds a new uniform via the ShaderMaterial merge path when it wasn't there before", () => {
    const instance = new THREE.ShaderMaterial({ uniforms: {} });
    const node = createNode(instance, root);

    applyProps(node, { uniforms: { opacity: { value: 0.5 } } });

    expect(instance.uniforms.opacity.value).toBe(0.5);
  });

  it("applies a pierced override after its base key regardless of declaration order", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);

    // Base key ("position") declared AFTER its pierced override
    // ("position-x") — the override must still win.
    applyProps(node, { "position-x": 5, position: [0, 1, 0] });

    expect(instance.position.toArray()).toEqual([5, 1, 0]);
  });
});

describe("resolvePath", () => {
  it("pierces multi-level dashed paths", () => {
    const target = { a: { b: { c: 42 } } };
    const result = resolvePath(target, "a-b-c");
    expect(result.root).toBe(target.a.b);
    expect(result.key).toBe("c");
    expect(result.target).toBe(42);
  });

  it("prefers a literal dashed key over piercing", () => {
    const target = { "a-b": 1, a: { b: 2 } };
    const result = resolvePath(target, "a-b");
    expect(result.target).toBe(1);
  });
});

describe("applyProps — reactive prop (rule 7)", () => {
  let root: RootState;

  beforeEach(() => {
    root = createTestRoot();
  });

  it("subscribes to a State read inside the prop function and re-applies on change", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);
    const spin = toState(0);

    applyProps(node, { "rotation-z": (listener: any) => spin.get(listener) });

    expect(instance.rotation.z).toBe(0);
    expect(root.invalidate).not.toHaveBeenCalled();

    spin.set(1.5);
    flushSync();

    expect(instance.rotation.z).toBe(1.5);
    expect(root.invalidate).toHaveBeenCalledTimes(1);
  });

  it("releases the previous subscription before rebinding the same key", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);
    const stateA = toState(1);
    const stateB = toState(2);

    applyProps(node, { "position-x": (listener: any) => stateA.get(listener) });
    expect(instance.position.x).toBe(1);

    // Re-apply the same key with a function reading a different state — the
    // subscription to stateA must be released.
    applyProps(node, { "position-x": (listener: any) => stateB.get(listener) });
    expect(instance.position.x).toBe(2);

    stateA.set(999);
    flushSync();
    expect(instance.position.x).toBe(2); // unaffected — old subscription released

    stateB.set(3);
    flushSync();
    expect(instance.position.x).toBe(3);
  });

  it("releases reactive subscriptions on node removal", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);
    const spin = toState(0);

    applyProps(node, { "rotation-z": (listener: any) => spin.get(listener) });
    expect(node.releases.length).toBeGreaterThan(0);

    for (const release of node.releases) release();

    spin.set(2);
    flushSync();
    expect(instance.rotation.z).toBe(0); // no longer subscribed
  });
});

describe("applyProps — on* rules 4/5/6", () => {
  let root: RootState;

  beforeEach(() => {
    root = createTestRoot();
  });

  it("rule 4: assigns directly when the key is already a callback property on the instance", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);
    const handler = vi.fn();
    const addEventListenerSpy = vi.spyOn(instance, "addEventListener");

    applyProps(node, { onBeforeRender: handler });

    expect(instance.onBeforeRender).toBe(handler);
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("rule 5: binds via addEventListener when the key is not an instance property", () => {
    const instance = new THREE.Object3D();
    const node = createNode(instance, root);
    const handler = vi.fn();

    applyProps(node, { onChange: handler });
    instance.dispatchEvent({ type: "change" } as any);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "change" }),
      root,
      instance,
    );
  });

  it("rule 5: derives dashed event names (onObjectChange -> objectChange)", () => {
    const instance = new THREE.Object3D();
    const node = createNode(instance, root);
    const handler = vi.fn();

    applyProps(node, { onObjectChange: handler });
    instance.dispatchEvent({ type: "objectChange" } as any);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rule 5: unbinds the previous handler when the key is re-applied", () => {
    const instance = new THREE.Object3D();
    const node = createNode(instance, root);
    const first = vi.fn();
    const second = vi.fn();

    applyProps(node, { onChange: first });
    applyProps(node, { onChange: second });
    instance.dispatchEvent({ type: "change" } as any);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("rule 6: binds every entry of an `on` record verbatim", () => {
    const instance = new THREE.Object3D();
    const node = createNode(instance, root);
    const handler = vi.fn();

    applyProps(node, { on: { "dragging-changed": handler } });
    instance.dispatchEvent({ type: "dragging-changed" } as any);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "dragging-changed" }),
      root,
      instance,
    );
  });
});

describe("applyProps — onFrame (rule 2) and pointer events (rule 1)", () => {
  let root: RootState;

  beforeEach(() => {
    root = createTestRoot();
  });

  it("registers onFrame through root.frame() with onFramePriority", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);
    const handler = vi.fn();

    applyProps(node, { onFrame: handler, onFramePriority: 5 });

    expect(root.internal.frameCallbacks).toHaveLength(1);
    expect(root.internal.frameCallbacks[0].priority).toBe(5);

    root.internal.frameCallbacks[0].callback(root, 0.016);
    expect(handler).toHaveBeenCalledWith(root, 0.016, instance);
  });

  it("unregisters the frame callback when onFrame is removed", () => {
    const instance = new THREE.Mesh();
    const node = createNode(instance, root);

    applyProps(node, { onFrame: vi.fn() });
    expect(root.internal.frameCallbacks).toHaveLength(1);

    applyProps(node, { onFrame: undefined });
    expect(root.internal.frameCallbacks).toHaveLength(0);
  });

  it("registers a pointer event and adds the instance to root.internal.interactive", () => {
    const instance = new THREE.Mesh();
    const parent = createNode(new THREE.Group(), root);
    const node = createNode(instance, root, parent);

    applyProps(node, { onClick: vi.fn() });

    expect(root.internal.interactive).toContain(instance);
  });

  it("removes the instance from root.internal.interactive once its last handler is removed", () => {
    const instance = new THREE.Mesh();
    const parent = createNode(new THREE.Group(), root);
    const node = createNode(instance, root, parent);

    applyProps(node, { onClick: vi.fn() });
    expect(root.internal.interactive).toContain(instance);

    applyProps(node, { onClick: undefined });
    expect(root.internal.interactive).not.toContain(instance);
  });

  it("exposes the exact pointer-event key whitelist", () => {
    expect(POINTER_EVENT_KEYS).toEqual([
      "onClick",
      "onContextMenu",
      "onDoubleClick",
      "onWheel",
      "onPointerUp",
      "onPointerDown",
      "onPointerOver",
      "onPointerOut",
      "onPointerEnter",
      "onPointerLeave",
      "onPointerMove",
      "onPointerMissed",
      "onPointerCancel",
      "onLostPointerCapture",
    ]);
  });
});

describe("attach / detach", () => {
  let root: RootState;

  beforeEach(() => {
    root = createTestRoot();
  });

  it("attaches via a plain string path and deletes it on detach when there was no previous value", () => {
    const parentInstance: any = {};
    const parent = createNode(parentInstance, root);
    const geometry = new THREE.BoxGeometry();
    const child = createNode(geometry, root, parent);
    child.props = { attach: "geometry" };

    attach(parent, child);
    expect(parentInstance.geometry).toBe(geometry);
    expect(child.attach).toBe("geometry");

    detach(parent, child);
    expect(parentInstance.geometry).toBeUndefined();
  });

  it("restores the previous value on detach when one existed", () => {
    const originalGeometry = new THREE.BoxGeometry();
    const parentInstance = new THREE.Mesh(originalGeometry);
    const parent = createNode(parentInstance, root);
    const newGeometry = new THREE.SphereGeometry();
    const child = createNode(newGeometry, root, parent);
    child.props = { attach: "geometry" };

    attach(parent, child);
    expect(parentInstance.geometry).toBe(newGeometry);

    detach(parent, child);
    expect(parentInstance.geometry).toBe(originalGeometry);
  });

  it("attaches via a dashed index path, allocating the array first", () => {
    const parentInstance: any = new THREE.Mesh();
    const parent = createNode(parentInstance, root);
    const material = new THREE.MeshBasicMaterial();
    const child = createNode(material, root, parent);
    child.props = { attach: "material-0" };

    attach(parent, child);
    expect(Array.isArray(parentInstance.material)).toBe(true);
    expect(parentInstance.material[0]).toBe(material);

    detach(parent, child);
    expect(parentInstance.material[0]).toBeUndefined();
  });

  it("resolves a nested pierced attach path", () => {
    const parentInstance: any = { level: { target: "old" } };
    const parent = createNode(parentInstance, root);
    const child = createNode({ marker: true }, root, parent);
    child.props = { attach: "level-target" };

    attach(parent, child);
    expect(parentInstance.level.target).toEqual({ marker: true });

    detach(parent, child);
    expect(parentInstance.level.target).toBe("old");
  });

  it("attaches via a function and calls its return value as the detach cleanup", () => {
    const parentInstance = { value: 0 };
    const parent = createNode(parentInstance, root);
    const child = createNode({}, root, parent);
    const cleanup = vi.fn();
    child.props = {
      attach: (parentObject: any, _childObject: any) => {
        parentObject.value = 1;
        return cleanup;
      },
    };

    attach(parent, child);
    expect(parentInstance.value).toBe(1);
    expect(child.attach).toBeNull();

    detach(parent, child);
    expect(cleanup).toHaveBeenCalledWith(parentInstance, child.instance);
  });
});
