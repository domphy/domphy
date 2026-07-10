import { flushSync } from "@domphy/core";
import * as THREE from "three";
import { beforeEach, describe, expect, it } from "vitest";
import { calculateDpr, createRootState } from "../src/rootState.js";
import type { SizeState } from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

let canvas: HTMLCanvasElement;

beforeEach(() => {
  canvas = document.createElement("canvas");
});

describe("createRootState — camera", () => {
  it("creates a default PerspectiveCamera(75, 1, 0.1, 1000) at [0,0,5] looking at the origin", () => {
    const root = createRootState({ canvas, gl: createStubRenderer() });

    expect(root.camera.isPerspectiveCamera).toBe(true);
    expect(root.camera.fov).toBe(75);
    expect(root.camera.aspect).toBe(1);
    expect(root.camera.near).toBe(0.1);
    expect(root.camera.far).toBe(1000);
    expect(root.camera.position.toArray()).toEqual([0, 0, 5]);
  });

  it("creates an OrthographicCamera when orthographic is set", () => {
    const root = createRootState({
      canvas,
      gl: createStubRenderer(),
      orthographic: true,
    });

    expect(root.camera.isOrthographicCamera).toBe(true);
    expect(root.camera.near).toBe(0.1);
    expect(root.camera.far).toBe(1000);
    expect(root.camera.position.toArray()).toEqual([0, 0, 5]);
  });

  it("adopts a user-provided camera instance verbatim, applying no defaults", () => {
    const userCamera = new THREE.PerspectiveCamera(50, 2, 1, 100);
    const root = createRootState({
      canvas,
      gl: createStubRenderer(),
      camera: { instance: userCamera },
    });

    expect(root.camera).toBe(userCamera);
    expect(root.camera.fov).toBe(50);
    // Not repositioned/reoriented — adoption is verbatim, unlike the default branch.
    expect(root.camera.position.toArray()).toEqual([0, 0, 0]);
  });
});

describe("createRootState — size", () => {
  it("setSize updates renderer.setSize, camera.aspect, and the reactive size state", () => {
    const gl = createStubRenderer();
    const root = createRootState({ canvas, gl });

    let seen: SizeState | undefined;
    root.size.get(((value: SizeState) => {
      seen = value;
    }) as any);

    root.setSize(800, 600);
    flushSync();

    expect(gl.calls.setSize).toEqual([[800, 600]]);
    expect(root.camera.aspect).toBeCloseTo(800 / 600);
    expect(root.size.get()).toEqual({ width: 800, height: 600, dpr: 1 });
    expect(seen).toEqual({ width: 800, height: 600, dpr: 1 });
  });

  it("reshapes an orthographic camera's frustum instead of setting aspect", () => {
    const root = createRootState({
      canvas,
      gl: createStubRenderer(),
      orthographic: true,
    });

    root.setSize(400, 200);

    expect(root.camera.left).toBe(-200);
    expect(root.camera.right).toBe(200);
    expect(root.camera.top).toBe(100);
    expect(root.camera.bottom).toBe(-100);
  });

  it("a camera.manual camera is left untouched by setSize", () => {
    const userCamera = new THREE.PerspectiveCamera(50, 2, 1, 100);
    (userCamera as any).manual = true;
    const root = createRootState({
      canvas,
      gl: createStubRenderer(),
      camera: { instance: userCamera },
    });

    root.setSize(800, 600);

    expect(root.camera.aspect).toBe(2);
  });

  it("dpr passed to setSize overrides the resolved dpr and calls setPixelRatio", () => {
    const gl = createStubRenderer();
    const root = createRootState({ canvas, gl });

    root.setSize(800, 600, 2);

    expect(root.size.get().dpr).toBe(2);
    expect(gl.calls.setPixelRatio).toEqual([[2]]);
  });

  it("setSize invalidates the root, requesting a render", () => {
    const root = createRootState({ canvas, gl: createStubRenderer() });
    // invalidate() is a no-op while internal.active is false (loop.ts) — a
    // root only becomes active once patch.ts flips it post-mount, so that
    // step is simulated here to isolate setSize's own invalidate() call.
    root.internal.active = true;
    expect(root.internal.frames).toBe(0);
    root.setSize(300, 150);
    expect(root.internal.frames).toBeGreaterThan(0);
  });
});

describe("createRootState — dpr resolution", () => {
  const originalDpr = window.devicePixelRatio;

  it("clamps a [min, max] dpr against the current devicePixelRatio (above range)", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 3,
      configurable: true,
    });
    const root = createRootState({
      canvas,
      gl: createStubRenderer(),
      dpr: [1, 2],
    });
    expect(root.size.get().dpr).toBe(2);
    Object.defineProperty(window, "devicePixelRatio", {
      value: originalDpr,
      configurable: true,
    });
  });

  it("clamps a [min, max] dpr against the current devicePixelRatio (below range)", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 0.1,
      configurable: true,
    });
    const root = createRootState({
      canvas,
      gl: createStubRenderer(),
      dpr: [1, 2],
    });
    expect(root.size.get().dpr).toBe(1);
    Object.defineProperty(window, "devicePixelRatio", {
      value: originalDpr,
      configurable: true,
    });
  });

  it("calculateDpr passes a plain number through unchanged", () => {
    expect(calculateDpr(2)).toBe(2);
  });
});

describe("createRootState — frame registration", () => {
  it("frame() registers a per-root callback and adjusts priorityCount only for priority > 0", () => {
    const root = createRootState({ canvas, gl: createStubRenderer() });
    expect(root.internal.frameCallbacks.length).toBe(0);
    expect(root.internal.priorityCount).toBe(0);

    const unregisterPlain = root.frame(() => {});
    expect(root.internal.frameCallbacks.length).toBe(1);
    expect(root.internal.priorityCount).toBe(0);

    const unregisterPriority = root.frame(() => {}, 2);
    expect(root.internal.frameCallbacks.length).toBe(2);
    expect(root.internal.priorityCount).toBe(1);

    unregisterPriority();
    expect(root.internal.frameCallbacks.length).toBe(1);
    expect(root.internal.priorityCount).toBe(0);

    unregisterPlain();
    expect(root.internal.frameCallbacks.length).toBe(0);
  });

  it("frame callbacks receive (root, delta) when advanced", () => {
    const root = createRootState({ canvas, gl: createStubRenderer() });
    const seen: Array<[unknown, number]> = [];
    root.frame((state, delta) => seen.push([state, delta]));

    root.advance(16);

    expect(seen.length).toBe(1);
    expect(seen[0]?.[0]).toBe(root);
    expect(typeof seen[0]?.[1]).toBe("number");
  });
});

describe("createRootState — setFrameloop", () => {
  it("switches the mode and stops/restarts the clock, resetting elapsedTime", () => {
    const root = createRootState({ canvas, gl: createStubRenderer() });
    expect(root.frameloop).toBe("always");
    expect(root.clock.running).toBe(true);

    root.clock.elapsedTime = 42;
    root.setFrameloop("never");
    expect(root.frameloop).toBe("never");
    expect(root.clock.running).toBe(false);
    expect(root.clock.elapsedTime).toBe(0);

    root.setFrameloop("demand");
    expect(root.frameloop).toBe("demand");
    expect(root.clock.running).toBe(true);
  });
});

describe("createRootState — internal", () => {
  it("initializes RootInternal per SPEC, with active=false until patch.ts flips it", () => {
    const root = createRootState({ canvas, gl: createStubRenderer() });
    expect(root.internal.active).toBe(false);
    expect(root.internal.frames).toBe(0);
    expect(root.internal.priorityCount).toBe(0);
    expect(root.internal.frameCallbacks).toEqual([]);
    expect(root.internal.interactive).toEqual([]);
    expect(root.internal.captured.size).toBe(0);
    expect(root.internal.hovered.size).toBe(0);
    expect(root.internal.initialClick).toEqual([0, 0]);
    expect(root.internal.initialHits).toEqual([]);
    expect(root.internal.lastEvent).toBeNull();
    expect(root.internal.subscribersDirty).toBe(false);
  });
});
