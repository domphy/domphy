import { State } from "@domphy/core";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEvents } from "../src/events.js";
import { applyProps } from "../src/props.js";
import type {
  RootInternal,
  RootState,
  SceneNode,
  SizeState,
} from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

// Hand-built RootState — mirrors props.test.ts's fixture (rootState.ts/
// reconciler.ts are out of scope for this module's unit tests per SPEC.md's
// testing guidance). Canvas is 800x600 so NDC math in the test cases below
// stays easy to reason about: center-of-screen is clientX=400, clientY=300.
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

  const size = new State<SizeState>({ width: 800, height: 600, dpr: 1 });

  const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const canvas = document.createElement("canvas");
  // Mocked per SPEC.md's test recipe — events.ts computes NDC from
  // event.clientX/clientY minus this rect's left/top (see events.ts's
  // `computePointer`: the canvas rect is the origin source that matches
  // setSize's container tracking), so the rect must report a stable origin.
  canvas.getBoundingClientRect = () =>
    ({
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
    }) as DOMRect;

  const root: RootState = {
    gl: createStubRenderer(),
    scene: new THREE.Scene(),
    camera,
    canvas,
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

function createNode(
  instance: any,
  root: RootState,
  parent: SceneNode | null,
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

// A minimal "target" double for the raw nativeEvent.target — deliberately
// NOT a real DOM element, so pointer-capture assertions don't depend on
// jsdom's (incomplete) Pointer Events capture implementation. events.ts only
// ever calls these three methods on it.
function createCaptureTarget() {
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => false),
  };
}

// Builds a real jsdom PointerEvent with client coordinates and an overridden
// offsetX/offsetY/target. computePointer reads clientX/clientY (supplied via
// the MouseEventInit dict); offsetX/offsetY are still overridden because the
// click-distance bookkeeping (initialClick/calculateDistance) reads them —
// they are computed read-only getters in real browsers, so they cannot be
// supplied through the PointerEventInit dict and are set as own properties.
function createPointerEvent(
  type: string,
  options: {
    offsetX: number;
    offsetY: number;
    pointerId?: number;
    target?: any;
  },
): PointerEvent {
  const event = new PointerEvent(type, {
    pointerId: options.pointerId ?? 1,
    bubbles: true,
    cancelable: true,
    // The mocked canvas rect sits at (0,0), so client == offset here.
    clientX: options.offsetX,
    clientY: options.offsetY,
  });
  Object.defineProperty(event, "offsetX", {
    value: options.offsetX,
    configurable: true,
  });
  Object.defineProperty(event, "offsetY", {
    value: options.offsetY,
    configurable: true,
  });
  Object.defineProperty(event, "target", {
    value: options.target ?? createCaptureTarget(),
    configurable: true,
  });
  return event;
}

function createClickEvent(options: {
  offsetX: number;
  offsetY: number;
  target?: any;
}): MouseEvent {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    clientX: options.offsetX,
    clientY: options.offsetY,
  });
  Object.defineProperty(event, "offsetX", {
    value: options.offsetX,
    configurable: true,
  });
  Object.defineProperty(event, "offsetY", {
    value: options.offsetY,
    configurable: true,
  });
  Object.defineProperty(event, "target", {
    value: options.target ?? createCaptureTarget(),
    configurable: true,
  });
  return event;
}

// Center-of-screen offsets hit both boxes (they're both centered on the
// camera's forward ray); a screen-corner offset misses both.
const CENTER = { offsetX: 400, offsetY: 300 };
const CORNER = { offsetX: 0, offsetY: 0 };

describe("events — intersection order, occlusion, hover, capture, miss", () => {
  let root: RootState;
  let sceneParent: SceneNode;

  beforeEach(() => {
    root = createTestRoot();
    sceneParent = createNode(root.scene, root, null);
  });

  function addMesh(z: number): { instance: THREE.Mesh; node: SceneNode } {
    const instance = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    instance.position.set(0, 0, z);
    root.scene.add(instance);
    const node = createNode(instance, root, sceneParent);
    return { instance, node };
  }

  it("delivers onClick nearest-first when two meshes overlap along the ray", () => {
    const near = addMesh(1);
    const far = addMesh(-1);
    root.scene.updateMatrixWorld(true);

    const order: string[] = [];
    applyProps(near.node, { onClick: () => order.push("near") });
    applyProps(far.node, { onClick: () => order.push("far") });

    const events = createEvents(root);
    // A click only fires on objects that were ALSO under the pointer at the
    // preceding pointerdown (reference parity: `internal.initialHits`) — a
    // real down+up sequence always precedes a browser "click".
    events.handlePointer("onPointerDown")(
      createPointerEvent("pointerdown", CENTER),
    );
    events.handlePointer("onClick")(createClickEvent(CENTER));

    expect(order).toEqual(["near", "far"]);
  });

  it("stopPropagation on the nearer mesh blocks the farther mesh's handler", () => {
    const near = addMesh(1);
    const far = addMesh(-1);
    root.scene.updateMatrixWorld(true);

    const farHandler = vi.fn();
    applyProps(near.node, {
      onClick: (event: any) => event.stopPropagation(),
    });
    applyProps(far.node, { onClick: farHandler });

    const events = createEvents(root);
    events.handlePointer("onPointerDown")(
      createPointerEvent("pointerdown", CENTER),
    );
    events.handlePointer("onClick")(createClickEvent(CENTER));

    expect(farHandler).not.toHaveBeenCalled();
  });

  it("fires onPointerOver/onPointerEnter on move-in and onPointerOut/onPointerLeave on move-away", () => {
    const mesh = addMesh(0);
    root.scene.updateMatrixWorld(true);

    const onPointerOver = vi.fn();
    const onPointerEnter = vi.fn();
    const onPointerOut = vi.fn();
    const onPointerLeave = vi.fn();
    applyProps(mesh.node, {
      onPointerOver,
      onPointerEnter,
      onPointerOut,
      onPointerLeave,
    });

    const events = createEvents(root);
    const move = events.handlePointer("onPointerMove");

    move(createPointerEvent("pointermove", CENTER));
    expect(onPointerOver).toHaveBeenCalledTimes(1);
    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    expect(onPointerOut).not.toHaveBeenCalled();
    expect(onPointerLeave).not.toHaveBeenCalled();

    move(createPointerEvent("pointermove", CORNER));
    expect(onPointerOut).toHaveBeenCalledTimes(1);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
    // Over/enter must not re-fire from the move-away event itself.
    expect(onPointerOver).toHaveBeenCalledTimes(1);
    expect(onPointerEnter).toHaveBeenCalledTimes(1);
  });

  it("routes pointermove to the capturing object even after the ray stops hitting it", () => {
    const mesh = addMesh(0);
    root.scene.updateMatrixWorld(true);

    const onPointerMove = vi.fn();
    applyProps(mesh.node, {
      // Reads pointerId off `nativeEvent` rather than the copied top-level
      // field — the top-level copy comes from a `for...in` walk over the raw
      // DOM event (reference parity), whose result depends on which
      // properties a given DOM implementation marks enumerable;
      // `nativeEvent` is always the exact object handed to handlePointer.
      onPointerDown: (event: any) =>
        event.target.setPointerCapture(event.nativeEvent.pointerId),
      onPointerMove,
    });

    const events = createEvents(root);
    const captureTarget = createCaptureTarget();

    events.handlePointer("onPointerDown")(
      createPointerEvent("pointerdown", {
        ...CENTER,
        pointerId: 7,
        target: captureTarget,
      }),
    );

    expect(captureTarget.setPointerCapture).toHaveBeenCalledWith(7);
    expect(root.internal.captured.get(7)?.has(mesh.instance)).toBe(true);

    // A move to the corner no longer geometrically hits the mesh — capture
    // must still route the event to it.
    events.handlePointer("onPointerMove")(
      createPointerEvent("pointermove", {
        ...CORNER,
        pointerId: 7,
        target: captureTarget,
      }),
    );

    expect(onPointerMove).toHaveBeenCalledTimes(1);
  });

  it("fires onPointerMissed (object-level and root-level) on an empty-space click", () => {
    const mesh = addMesh(0);
    root.scene.updateMatrixWorld(true);

    const onClick = vi.fn();
    const onPointerMissed = vi.fn();
    applyProps(mesh.node, { onClick, onPointerMissed });
    root.onPointerMissed = vi.fn();

    const events = createEvents(root);
    events.handlePointer("onClick")(createClickEvent(CORNER));

    expect(onClick).not.toHaveBeenCalled();
    expect(onPointerMissed).toHaveBeenCalledTimes(1);
    expect(root.onPointerMissed).toHaveBeenCalledTimes(1);
  });

  it("skips interactive objects whose raycast is nulled out instead of throwing", () => {
    const nulled = addMesh(0);
    const healthy = addMesh(1);
    root.scene.updateMatrixWorld(true);

    const nulledMove = vi.fn();
    const healthyMove = vi.fn();
    // Declared in ONE bag on purpose: applyProps applies the handler (and the
    // `interactive` membership) BEFORE the static `raycast: null` assignment,
    // so membership and the null raycast diverge — the exact state the
    // grammar's raycast opt-out (SPEC.md) can leave behind. props.ts's
    // raycast-aware membership check only runs when a pointer-event prop is
    // (re-)applied, so it never gets a chance to undo this.
    applyProps(nulled.node, { onPointerMove: nulledMove, raycast: null });
    applyProps(healthy.node, { onPointerMove: healthyMove });
    expect(nulled.instance.raycast).toBeNull();
    expect(root.internal.interactive).toContain(nulled.instance);

    const events = createEvents(root);
    const move = events.handlePointer("onPointerMove");

    // Three calls object.raycast() unconditionally inside intersectObject —
    // before the fix this TypeError'd and killed the whole event layer.
    expect(() => move(createPointerEvent("pointermove", CENTER))).not.toThrow();
    // Excluded from raycasting means no hit for the nulled mesh, but the
    // rest of the event layer keeps working.
    expect(nulledMove).not.toHaveBeenCalled();
    expect(healthyMove).toHaveBeenCalledTimes(1);
  });

  it("swapInteractivity rewrites the captured record's intersection to the new instance", async () => {
    const { swapInteractivity } = await import("../src/events.js");
    const mesh = addMesh(0);
    root.scene.updateMatrixWorld(true);

    let capturedEvent: any = null;
    const onPointerMove = vi.fn((event: any) => {
      capturedEvent = event;
    });
    applyProps(mesh.node, {
      onPointerDown: (event: any) =>
        event.target.setPointerCapture(event.nativeEvent.pointerId),
      onPointerMove,
    });

    const events = createEvents(root);
    events.handlePointer("onPointerDown")(
      createPointerEvent("pointerdown", { ...CENTER, pointerId: 7 }),
    );
    expect(root.internal.captured.get(7)?.has(mesh.instance)).toBe(true);

    // Reconstruct (args change) mid-capture: the reconciler swaps
    // interactivity onto the new instance and re-applies the props.
    const newMesh = new THREE.Mesh(
      mesh.instance.geometry,
      mesh.instance.material,
    );
    newMesh.position.copy(mesh.instance.position);
    swapInteractivity(root, mesh.instance, newMesh);
    applyProps(createNode(newMesh, root, sceneParent), { onPointerMove });

    // Move far off the mesh — only the stored capture record can route this
    // back, so the delivered event is built from that record's intersection.
    events.handlePointer("onPointerMove")(
      createPointerEvent("pointermove", { ...CORNER, pointerId: 7 }),
    );

    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(capturedEvent.eventObject).toBe(newMesh);
    expect(capturedEvent.object).toBe(newMesh);
  });
});

describe("events — swapInteractivity / removeInteractivity", () => {
  it("removeInteractivity clears interactive/initialHits/hovered/captured entries for the object", async () => {
    const { removeInteractivity } = await import("../src/events.js");
    const root = createTestRoot();
    const object = new THREE.Mesh();

    root.internal.interactive.push(object);
    root.internal.initialHits.push(object);
    root.internal.hovered.set("id", { object, eventObject: object });
    root.internal.captured.set(1, new Set([object]));

    removeInteractivity(root, object);

    expect(root.internal.interactive).not.toContain(object);
    expect(root.internal.initialHits).not.toContain(object);
    expect(root.internal.hovered.size).toBe(0);
    expect(root.internal.captured.has(1)).toBe(false);
  });

  it("swapInteractivity moves interactive/initialHits/hovered/captured entries to the new object", async () => {
    const { swapInteractivity } = await import("../src/events.js");
    const root = createTestRoot();
    const object = new THREE.Mesh();
    const newObject = new THREE.Mesh();

    root.internal.interactive.push(object);
    root.internal.initialHits.push(object);
    root.internal.hovered.set("id", { object, eventObject: object });
    root.internal.captured.set(1, new Set([object]));

    swapInteractivity(root, object, newObject);

    expect(root.internal.interactive).toContain(newObject);
    expect(root.internal.interactive).not.toContain(object);
    expect(root.internal.initialHits).toContain(newObject);
    expect(Array.from(root.internal.hovered.values())[0]?.eventObject).toBe(
      newObject,
    );
    expect(root.internal.captured.get(1)?.has(newObject)).toBe(true);
    expect(root.internal.captured.get(1)?.has(object)).toBe(false);
  });

  it("removeInteractivity removes EVERY duplicate occurrence of the object", async () => {
    const { removeInteractivity } = await import("../src/events.js");
    const root = createTestRoot();
    const object = new THREE.Mesh();

    // Duplicates happen in practice: initialHits gets one entry per hit
    // (several faces of one mesh can each push the same eventObject).
    root.internal.interactive.push(object, object);
    root.internal.initialHits.push(object, object, object);

    removeInteractivity(root, object);

    expect(root.internal.interactive).not.toContain(object);
    expect(root.internal.initialHits).not.toContain(object);
  });

  it("swapInteractivity replaces EVERY duplicate occurrence of the object", async () => {
    const { swapInteractivity } = await import("../src/events.js");
    const root = createTestRoot();
    const object = new THREE.Mesh();
    const newObject = new THREE.Mesh();

    root.internal.interactive.push(object, object);
    root.internal.initialHits.push(object, object, object);

    swapInteractivity(root, object, newObject);

    expect(root.internal.interactive).toEqual([newObject, newObject]);
    expect(root.internal.initialHits).toEqual([
      newObject,
      newObject,
      newObject,
    ]);
  });

  // Builds a captured-mesh fixture for the implicit-release regression tests
  // below: a real raycast-hit mesh whose pointerdown captures pointer 7 on a
  // state-tracking capture double (mimics the DOM API: releasing without an
  // active capture throws NotFoundError).
  function setupImplicitRelease(options: { implementHas: boolean }) {
    const root = createTestRoot();
    const sceneParent = createNode(root.scene, root, null);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    root.scene.add(mesh);
    root.scene.updateMatrixWorld(true);
    const node = createNode(mesh, root, sceneParent);
    applyProps(node, {
      onPointerDown: (event: any) =>
        event.target.setPointerCapture(event.nativeEvent.pointerId),
    });

    const state = { captured: false };
    const captureTarget: any = {
      setPointerCapture: vi.fn(() => {
        state.captured = true;
      }),
      releasePointerCapture: vi.fn(() => {
        if (!state.captured)
          throw new DOMException("No capture to release", "NotFoundError");
        state.captured = false;
      }),
    };
    if (options.implementHas)
      captureTarget.hasPointerCapture = vi.fn(() => state.captured);

    const events = createEvents(root);
    events.handlePointer("onPointerDown")(
      createPointerEvent("pointerdown", {
        ...CENTER,
        pointerId: 7,
        target: captureTarget,
      }),
    );
    expect(state.captured).toBe(true);

    return { root, mesh, captureTarget, state };
  }

  it("removeInteractivity does not throw when the browser already implicitly released the capture", async () => {
    const { removeInteractivity } = await import("../src/events.js");
    const { root, mesh, captureTarget, state } = setupImplicitRelease({
      implementHas: true,
    });

    // The browser implicitly releases on pointerup while this package's
    // bookkeeping (rAF-deferred lostpointercapture cleanup) hasn't caught up.
    state.captured = false;

    expect(() => removeInteractivity(root, mesh)).not.toThrow();
    // hasPointerCapture reported "no capture" — the DOM release must be
    // skipped entirely (calling it would throw NotFoundError).
    expect(captureTarget.releasePointerCapture).not.toHaveBeenCalled();
  });

  it("removeInteractivity swallows NotFoundError from targets without hasPointerCapture", async () => {
    const { removeInteractivity } = await import("../src/events.js");
    const { root, mesh, captureTarget, state } = setupImplicitRelease({
      implementHas: false,
    });

    state.captured = false;

    // No hasPointerCapture to consult — the guarded fallback must catch the
    // DOM's NotFoundError instead of letting it escape mid-disposal.
    expect(() => removeInteractivity(root, mesh)).not.toThrow();
    expect(captureTarget.releasePointerCapture).toHaveBeenCalledWith(7);
  });
});

describe("events — connect/disconnect", () => {
  it("connect binds native listeners to the canvas and disconnect removes them", () => {
    const root = createTestRoot();
    const events = createEvents(root);
    const addSpy = vi.spyOn(root.canvas, "addEventListener");
    const removeSpy = vi.spyOn(root.canvas, "removeEventListener");

    events.connect(root.canvas);
    expect(addSpy).toHaveBeenCalledWith("pointermove", expect.any(Function), {
      passive: true,
    });
    expect(addSpy).toHaveBeenCalledWith("click", expect.any(Function), {
      passive: false,
    });

    events.disconnect();
    expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("a click dispatched through the connected canvas reaches a registered onClick handler", () => {
    const root = createTestRoot();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    mesh.position.set(0, 0, 0);
    root.scene.add(mesh);
    root.scene.updateMatrixWorld(true);

    const sceneParent = createNode(root.scene, root, null);
    const node = createNode(mesh, root, sceneParent);
    const onClick = vi.fn();
    applyProps(node, { onClick });

    const events = createEvents(root);
    events.connect(root.canvas);
    // Real down-then-click sequence — a click only reaches an object that
    // was also under the pointer at the preceding pointerdown.
    root.canvas.dispatchEvent(createPointerEvent("pointerdown", CENTER));
    root.canvas.dispatchEvent(createClickEvent(CENTER));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("computes NDC from the canvas rect origin (clientX/Y minus rect.left/top), not raw client coordinates", () => {
    // Regression harness for computePointer's rect alignment: the canvas sits
    // 100px right / 50px down the page, so a client gesture at (500, 350) is
    // the canvas CENTER (400/800, 300/600 canvas-relative → NDC (0, 0)). The
    // old offsetX/offsetY math would have treated the raw 500/350 as
    // canvas-relative and missed the centered mesh.
    const root = createTestRoot();
    root.canvas.getBoundingClientRect = () =>
      ({
        width: 800,
        height: 600,
        left: 100,
        top: 50,
        right: 900,
        bottom: 650,
        x: 100,
        y: 50,
      }) as DOMRect;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    mesh.position.set(0, 0, 0);
    root.scene.add(mesh);
    root.scene.updateMatrixWorld(true);

    const sceneParent = createNode(root.scene, root, null);
    const node = createNode(mesh, root, sceneParent);
    const onPointerMove = vi.fn();
    applyProps(node, { onPointerMove });

    const events = createEvents(root);
    events.handlePointer("onPointerMove")(
      createPointerEvent("pointermove", { offsetX: 500, offsetY: 350 }),
    );

    expect(root.pointer.x).toBeCloseTo(0);
    expect(root.pointer.y).toBeCloseTo(0);
    expect(onPointerMove).toHaveBeenCalledTimes(1);
  });
});
