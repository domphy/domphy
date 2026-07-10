import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearRegistry, extend } from "../src/catalog.js";
import { three } from "../src/patch.js";
import type { RootState, ThreeOptions } from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

// Port of react-three-fiber's tests/renderer.test.tsx. SPEC.md's acceptance
// guidance: acceptance focuses on the full mount path through `three()`, so
// every case below mounts via the ONE real DOM entrypoint (`three()` applied
// to a `div`) rather than calling reconciler.ts's create/patch functions
// directly (that level is already covered by tests/reconciler.test.ts).
//
// React-specific cases (ref objects, effect-ordering, Suspense, JSX
// tag-namespace collisions) have no Domphy equivalent — see
// tests/PORT-NOTES.md (renderer.test.tsx section) for the full list with reasons.
//
// A Domphy-specific execution-model note used throughout this file: a reused
// node's props are always the FULL new description, not a diff — so
// "unsetting" a value means OMITTING the key from the next description, not
// passing `undefined` explicitly (an explicit `undefined` on a static prop is
// ignored, matching applyStaticProp's "never stomp with undefined" rule).
// Second, exceptions thrown while a reactive listener runs (a scene function
// re-firing on a State change, or `three()`'s own ReadableState<ThreeOptions>
// re-apply) are caught and `console.error`-logged by @domphy/core's Notifier
// (packages/core/src/classes/Notifier.ts `_flush`) rather than rethrown to
// the caller — unlike React, where a component throwing during a commit
// propagates synchronously through `act()`. Cases below that port an
// upstream "throws on update" assertion therefore spy on `console.error`
// instead of wrapping the update in try/catch.

// A minimal Mock class taking a constructor arg, registered via extend() —
// mirrors the reference file's own `class Mock extends THREE.Group`.
class Mock extends THREE.Group {
  static instances: string[] = [];
  constructor(name = "") {
    super();
    this.name = name;
    Mock.instances.push(name);
  }
}

extend({ Mock });

// jsdom has no ResizeObserver — three()'s _onMount always constructs one, so
// every mount needs this stub present. None of the ported cases below need
// to fire it manually (unlike patch.test.ts's own resize-specific tests).
class ResizeObserverStub {
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
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

function mountThree(options: ThreeOptions): {
  host: HTMLElement;
  node: ElementNode;
  getRoot: () => RootState;
} {
  let capturedRoot: RootState | undefined;
  const { host, node } = mount({
    div: null,
    $: [
      three({
        createRenderer: () => createStubRenderer(),
        ...options,
        onCreated: (root) => {
          capturedRoot = root;
          options.onCreated?.(root);
        },
      }),
    ],
  } as DomphyElement);
  return {
    host,
    node,
    getRoot: () => capturedRoot!,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  clearRegistry();
  extend({ Mock });
});

describe("renderer", () => {
  it("should render empty JSX", () => {
    const { getRoot } = mountThree({ scene: null });
    expect(getRoot().scene.children.length).toBe(0);
  });

  it("should render native elements", () => {
    const { getRoot } = mountThree({
      scene: [{ group: null, name: "native" }],
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBeInstanceOf(THREE.Group);
    expect(scene.children[0].name).toBe("native");
  });

  it("should render extended elements", () => {
    const { getRoot } = mountThree({ scene: [{ mock: null, name: "mock" }] });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBeInstanceOf(Mock);
    expect(scene.children[0].name).toBe("mock");
    // Upstream's second half — `const Component = extend(THREE.Mesh)` used
    // directly as a JSX tag — has no Domphy equivalent: extend() here only
    // registers names for `resolve()`, it never hands back a usable tag. See
    // tests/PORT-NOTES.md.
  });

  it("should render primitives", () => {
    const object = new THREE.Object3D();
    const { getRoot } = mountThree({
      scene: [{ primitive: null, object, name: "primitive" }],
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBe(object);
    expect(object.name).toBe("primitive");
  });

  it("should remove children from primitive when unmounted", () => {
    const object = new THREE.Group();
    const show = toState(true);

    const { getRoot } = mountThree({
      scene: (l) =>
        show.get(l)
          ? [
              {
                primitive: [
                  { group: null, name: "A" },
                  { group: null, name: "B" },
                ],
                object,
              },
            ]
          : null,
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBe(object);
    expect(object.children.length).toBe(2);

    show.set(false);
    flushSync();

    expect(scene.children.length).toBe(0);
    expect(object.children.length).toBe(0);
  });

  it("should remove then add children from primitive when key changes", () => {
    const object = new THREE.Group();
    const primitiveKey = toState("A");

    const { getRoot } = mountThree({
      scene: (l) => [
        {
          primitive: [
            { group: null, name: "A" },
            { group: null, name: "B" },
          ],
          object,
          _key: primitiveKey.get(l),
        },
      ],
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBe(object);
    expect(object.children.length).toBe(2);

    primitiveKey.set("B");
    flushSync();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBe(object);
    expect(object.children.length).toBe(2);
  });

  it("should handle children", () => {
    const { getRoot } = mountThree({ scene: [{ group: [{ mesh: null }] }] });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBeInstanceOf(THREE.Group);
    expect(scene.children[0].children.length).toBe(1);
    expect(scene.children[0].children[0]).toBeInstanceOf(THREE.Mesh);
  });

  it("should handle attach", () => {
    const attachSpy = vi.fn();
    const detachSpy = vi.fn();

    const { getRoot } = mountThree({
      scene: [
        {
          mesh: [
            { boxGeometry: null },
            { meshStandardMaterial: null },
            { group: null, attach: "userData-group" },
            {
              group: null,
              attach: () => {
                attachSpy();
                return detachSpy;
              },
            },
          ],
        },
      ],
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0]).toBeInstanceOf(THREE.Mesh);
    // Handles geometry & material attach
    const mesh = scene.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
    expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    // Handles nested attach
    expect((mesh.userData as any).group).toBeInstanceOf(THREE.Group);
    // attach bypasses scene-graph
    expect(mesh.children.length).toBe(0);
    // attaches before being added
    expect(attachSpy).toHaveBeenCalledTimes(1);
  });

  it("should update props reactively", () => {
    const name = toState<string | undefined>(undefined);
    const { getRoot } = mountThree({
      scene: (l) => [
        {
          group: null,
          ...(name.get(l) !== undefined ? { name: name.get(l) } : {}),
        },
      ],
    });
    const group = getRoot().scene.children[0] as THREE.Group;

    // Initial
    expect(group.name).toBe(new THREE.Group().name);

    // Set
    name.set("one");
    flushSync();
    expect(group.name).toBe("one");

    // Update
    name.set("two");
    flushSync();
    expect(group.name).toBe("two");

    // Unset (key omitted entirely from the next description)
    name.set(undefined);
    flushSync();
    expect(group.name).toBe(new THREE.Group().name);
  });

  it("should handle event props reactively", () => {
    const hasClick = toState(false);
    const hasPointerOver = toState(false);

    const { getRoot } = mountThree({
      scene: (l) => [
        {
          mesh: null,
          ...(hasClick.get(l) ? { onClick: () => {} } : {}),
          ...(hasPointerOver.get(l) ? { onPointerOver: () => {} } : {}),
        },
      ],
    });
    const { scene, internal } = getRoot();
    const mesh = scene.children[0];

    // Initial
    expect(internal.interactive.length).toBe(0);

    // Set
    hasClick.set(true);
    flushSync();
    expect(internal.interactive.length).toBe(1);
    expect(internal.interactive).toStrictEqual([mesh]);

    // Update (onClick key disappears entirely, onPointerOver appears)
    hasClick.set(false);
    hasPointerOver.set(true);
    flushSync();
    expect(internal.interactive.length).toBe(1);
    expect(internal.interactive).toStrictEqual([mesh]);

    // Unset
    hasPointerOver.set(false);
    flushSync();
    expect(internal.interactive.length).toBe(0);
  });

  it("should handle the args prop reactively", () => {
    const args = toState<[THREE.BufferGeometry, THREE.Material] | undefined>(
      undefined,
    );

    const { getRoot } = mountThree({
      scene: (l) => [
        {
          mesh: [
            { object3D: null, _key: "child" },
            {
              object3D: null,
              _key: "attachedChild",
              attach: "userData-attach",
            },
          ],
          ...(args.get(l) !== undefined ? { args: args.get(l) } : {}),
        },
      ],
    });
    // A mesh whose `args` changed is RECONSTRUCTED (a brand-new Mesh
    // instance per SPEC.md's reconcile semantics) — so, unlike `child`/
    // `attachedChild` below (moved onto the new instance, same identity
    // throughout), the mesh reference itself must be re-read after every
    // update instead of cached (mirrors a React ref auto-repointing to
    // whatever mounted most recently).
    const child = (getRoot().scene.children[0] as THREE.Mesh).children[0];
    const attachedChild = (
      (getRoot().scene.children[0] as THREE.Mesh).userData as any
    ).attach;

    // Initial (default geometry/material — not the args-driven ones below)
    let mesh = getRoot().scene.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(mesh.geometry).not.toBeInstanceOf(THREE.BoxGeometry);
    expect(mesh.material).toBeInstanceOf(THREE.Material);
    expect(mesh.material).not.toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(mesh.children[0]).toBe(child);
    expect((mesh.userData as any).attach).toBe(attachedChild);

    // Set
    const geometry1 = new THREE.BoxGeometry();
    const material1 = new THREE.MeshStandardMaterial();
    args.set([geometry1, material1]);
    flushSync();
    mesh = getRoot().scene.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBe(geometry1);
    expect(mesh.material).toBe(material1);
    expect(mesh.children[0]).toBe(child);
    expect((mesh.userData as any).attach).toBe(attachedChild);

    // Update
    const geometry2 = new THREE.BoxGeometry();
    const material2 = new THREE.MeshStandardMaterial();
    args.set([geometry2, material2]);
    flushSync();
    mesh = getRoot().scene.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBe(geometry2);
    expect(mesh.material).toBe(material2);
    expect(mesh.children[0]).toBe(child);
    expect((mesh.userData as any).attach).toBe(attachedChild);

    // Unset
    args.set(undefined);
    flushSync();
    mesh = getRoot().scene.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(mesh.geometry).not.toBeInstanceOf(THREE.BoxGeometry);
    expect(mesh.material).toBeInstanceOf(THREE.Material);
    expect(mesh.material).not.toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(mesh.children[0]).toBe(child);
    expect((mesh.userData as any).attach).toBe(attachedChild);
  });

  it("throws when the args prop is set to a non-array value", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const args = toState<any>(undefined);

    mountThree({
      scene: (l) => [
        {
          mesh: null,
          ...(args.get(l) !== undefined ? { args: args.get(l) } : {}),
        },
      ],
    });

    args.set({});
    flushSync();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '@domphy/three: the "args" prop must be an array!',
      }),
    );
    consoleErrorSpy.mockRestore();
  });

  it("should handle the object prop reactively", () => {
    const object1 = new THREE.Object3D();
    const child1 = new THREE.Object3D();
    object1.add(child1);

    const object2 = new THREE.Object3D();
    const child2 = new THREE.Object3D();
    object2.add(child2);

    const object = toState(object1);

    const { getRoot } = mountThree({
      scene: (l) => [
        {
          primitive: [
            { object3D: null, _key: "child" },
            {
              object3D: null,
              _key: "attachedChild",
              attach: "userData-attach",
            },
          ],
          object: object.get(l),
        },
      ],
    });
    const scene = getRoot().scene;
    const ownChild = object1.children.find((child) => child !== child1)!;
    const attachedChild = (object1.userData as any).attach;

    // Initial
    expect(scene.children[0]).toBe(object1);
    expect(object1.children).toStrictEqual([child1, ownChild]);
    expect((object1.userData as any).attach).toBe(attachedChild);

    // Update
    object.set(object2);
    flushSync();
    expect(scene.children[0]).toBe(object2);
    expect(object2.children).toStrictEqual([child2, ownChild]);
    expect((object2.userData as any).attach).toBe(attachedChild);

    // Revert
    object.set(object1);
    flushSync();
    expect(scene.children[0]).toBe(object1);
    expect(object1.children).toStrictEqual([child1, ownChild]);
    expect((object1.userData as any).attach).toBe(attachedChild);
  });

  it("throws when a primitive's object prop is removed", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const object = toState<THREE.Object3D | undefined>(new THREE.Object3D());

    mountThree({
      scene: (l) => [{ primitive: null, object: object.get(l) }],
    });

    object.set(undefined);
    flushSync();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '@domphy/three: primitive without "object" is invalid.',
      }),
    );
    consoleErrorSpy.mockRestore();
  });

  it("should handle unmount", () => {
    const dispose = vi.fn();
    const childDispose = vi.fn();
    const attachDispose = vi.fn();
    const flagDispose = vi.fn();
    const attachSpy = vi.fn();
    const detachSpy = vi.fn();
    const disposeDeclarativePrimitive = vi.fn();

    const object = Object.assign(new THREE.Object3D(), { dispose: vi.fn() });
    const objectExternal = Object.assign(new THREE.Object3D(), {
      dispose: vi.fn(),
    });
    object.add(objectExternal);

    const { node, getRoot } = mountThree({
      scene: [
        {
          mesh: [
            {
              object3D: null,
              onUpdate: (self: any) => (self.dispose = childDispose),
            },
            {
              object3D: null,
              attach: () => {
                attachSpy();
                return detachSpy;
              },
              onUpdate: (self: any) => (self.dispose = attachDispose),
            },
            {
              object3D: null,
              dispose: null,
              onUpdate: (self: any) => (self.dispose = flagDispose),
            },
            {
              primitive: [
                {
                  object3D: null,
                  onUpdate: (self: any) =>
                    (self.dispose = disposeDeclarativePrimitive),
                },
              ],
              object,
            },
          ],
          onClick: () => {},
          onUpdate: (self: any) => (self.dispose = dispose),
        },
      ],
    });

    const { scene, internal } = getRoot();
    expect(scene.children.length).toBe(1);

    node.remove();

    // Cleans up scene-graph
    expect(scene.children.length).toBe(0);
    // Removes events
    expect(internal.interactive.length).toBe(0);
    // Calls dispose on top-level instance
    expect(dispose).toHaveBeenCalled();
    // Also disposes of children
    expect(childDispose).toHaveBeenCalled();
    // Disposes of attached children
    expect(attachDispose).toHaveBeenCalled();
    // Properly detaches attached children
    expect(attachSpy).toHaveBeenCalledTimes(1);
    expect(detachSpy).toHaveBeenCalledTimes(1);
    // Respects dispose={null}
    expect(flagDispose).not.toHaveBeenCalled();
    // Does not dispose of primitives
    expect(object.dispose).not.toHaveBeenCalled();
    // Only disposes of declarative primitive children
    expect(objectExternal.dispose).not.toHaveBeenCalled();
    expect(disposeDeclarativePrimitive).toHaveBeenCalled();
  });

  it("can swap 4 array primitives", () => {
    const a = new THREE.Group();
    a.name = "a";
    const b = new THREE.Group();
    b.name = "b";
    const c = new THREE.Group();
    c.name = "c";
    const d = new THREE.Group();
    d.name = "d";

    const array = toState([a, b, c, d]);

    const { getRoot } = mountThree({
      scene: (l) =>
        array.get(l).map((group, index) => ({
          primitive: null,
          object: group,
          _key: index,
        })),
    });
    const { scene } = getRoot();

    expect(scene.children.map((o) => o.name)).toStrictEqual([
      "a",
      "b",
      "c",
      "d",
    ]);

    array.set([d, c, b, a]);
    flushSync();
    expect(scene.children.map((o) => o.name)).toStrictEqual([
      "d",
      "c",
      "b",
      "a",
    ]);

    array.set([b, a, d, c]);
    flushSync();
    expect(scene.children.map((o) => o.name)).toStrictEqual([
      "b",
      "a",
      "d",
      "c",
    ]);
  });

  // https://github.com/pmndrs/react-three-fiber/issues/3125
  // https://github.com/pmndrs/react-three-fiber/issues/3143
  it("can swap 4 array primitives via attach", () => {
    const a = new THREE.Group();
    a.name = "a";
    const b = new THREE.Group();
    b.name = "b";
    const c = new THREE.Group();
    c.name = "c";
    const d = new THREE.Group();
    d.name = "d";

    const array = toState([a, b, c, d]);

    const { getRoot } = mountThree({
      scene: (l) =>
        array.get(l).map((group, index) => ({
          primitive: null,
          object: group,
          _key: index,
          attach: `userData-objects-${index}`,
        })),
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(0);
    expect(
      (scene.userData as any).objects.map((o: THREE.Object3D) => o.name),
    ).toStrictEqual(["a", "b", "c", "d"]);

    array.set([d, c, b, a]);
    flushSync();
    expect(scene.children.length).toBe(0);
    expect(
      (scene.userData as any).objects.map((o: THREE.Object3D) => o.name),
    ).toStrictEqual(["d", "c", "b", "a"]);

    array.set([b, a, d, c]);
    flushSync();
    expect(scene.children.length).toBe(0);
    expect(
      (scene.userData as any).objects.map((o: THREE.Object3D) => o.name),
    ).toStrictEqual(["b", "a", "d", "c"]);
  });

  it("preserves camera frustum props for perspective", () => {
    const { getRoot } = mountThree({ scene: null, camera: { aspect: 0 } });
    const camera = getRoot().camera as THREE.PerspectiveCamera;
    expect(camera.aspect).toBe(0);
  });

  it("preserves camera frustum props for orthographic", () => {
    const { getRoot } = mountThree({
      scene: null,
      orthographic: true,
      camera: { left: 0, right: 0, top: 0, bottom: 0 },
    });
    const camera = getRoot().camera as THREE.OrthographicCamera;
    expect(camera.left).toBe(0);
    expect(camera.right).toBe(0);
    expect(camera.top).toBe(0);
    expect(camera.bottom).toBe(0);
  });

  it("should properly handle array of components with changing keys and order", () => {
    const values = toState([1, 2, 3, 4]);

    const { getRoot } = mountThree({
      scene: (l) =>
        values
          .get(l)
          .map((value) => ({ mesh: null, _key: value, name: `mesh-${value}` })),
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(4);
    expect(scene.children.map((child) => child.name).sort()).toEqual([
      "mesh-1",
      "mesh-2",
      "mesh-3",
      "mesh-4",
    ]);

    values.set([3, 1, 4]);
    flushSync();
    expect(scene.children.length).toBe(3);
    expect(scene.children.map((child) => child.name).sort()).toEqual([
      "mesh-1",
      "mesh-3",
      "mesh-4",
    ]);
    expect(
      scene.children.find((child) => child.name === "mesh-2"),
    ).toBeUndefined();
    expect(new Set(scene.children.map((child) => child.name)).size).toBe(
      scene.children.length,
    );

    values.set([4, 1]);
    flushSync();
    expect(scene.children.length).toBe(2);
    expect(scene.children.map((child) => child.name).sort()).toEqual([
      "mesh-1",
      "mesh-4",
    ]);
    expect(
      scene.children.find((child) => child.name === "mesh-3"),
    ).toBeUndefined();
    expect(new Set(scene.children.map((child) => child.name)).size).toBe(
      scene.children.length,
    );
  });

  it("should update scene synchronously with flushSync", () => {
    const positionX = toState(0);

    const { getRoot } = mountThree({
      scene: (l) => [{ mesh: null, "position-x": positionX.get(l) }],
    });
    const { scene } = getRoot();

    expect(scene.children.length).toBe(1);

    positionX.set(1);
    flushSync();

    expect(scene.children.length).toBe(1);
    expect(scene.children[0].position.x).toBe(1);
  });
});
