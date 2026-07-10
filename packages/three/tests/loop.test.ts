import { State } from "@domphy/core";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAfterEffect,
  addEffect,
  advance,
  invalidate,
  loop,
  registerFrameCallback,
  registerRoot,
  unregisterRoot,
} from "../src/loop.js";
import type { FrameCallback, RootState } from "../src/types.js";
import { createStubRenderer, type StubRenderer } from "./stubRenderer.js";

type TestRoot = RootState & { gl: StubRenderer };

const createdRoots: TestRoot[] = [];

// Hand-built minimal RootState — mirrors what rootState.ts's createRootState()
// wires up, but built directly here since rootState.ts is out of scope for
// this module's tests (per SPEC.md's testing guidance).
function createTestRoot(
  frameloop: "always" | "demand" | "never" = "always",
  active = true,
): TestRoot {
  const gl = createStubRenderer();
  const clock = new THREE.Clock();
  clock.start();

  const root: TestRoot = {
    gl,
    scene: { isScene: true },
    camera: { isCamera: true },
    canvas: document.createElement("canvas"),
    raycaster: {},
    pointer: {},
    clock,
    frameloop,
    size: new State({ width: 0, height: 0, dpr: 1 }),
    invalidate(frames?: number) {
      invalidate(root, frames);
    },
    advance(timestamp: number, runGlobalCallbacks?: boolean) {
      advance(timestamp, runGlobalCallbacks, root);
    },
    frame(callback: FrameCallback, priority?: number) {
      return registerFrameCallback(root, callback, priority);
    },
    setFrameloop(mode: "always" | "demand" | "never") {
      root.frameloop = mode;
    },
    internal: {
      frameCallbacks: [],
      priorityCount: 0,
      interactive: [],
      captured: new Map(),
      initialClick: [0, 0],
      initialHits: [],
      hovered: new Map(),
      lastEvent: null,
      active,
      frames: 0,
      subscribersDirty: false,
    },
  };

  createdRoots.push(root);
  registerRoot(root);
  return root;
}

beforeEach(() => {
  // Every test drives the loop by calling loop()/advance() directly rather
  // than waiting on a real animation frame. Fake timers (which fake rAF too)
  // stop loop()'s self-rescheduling requestAnimationFrame(loop) call from
  // ever firing for real and bleeding into later tests.
  vi.useFakeTimers();
});

afterEach(() => {
  for (const root of createdRoots.splice(0)) unregisterRoot(root);
  vi.useRealTimers();
});

describe("loop", () => {
  it("demand mode renders exactly the invalidated frame count, then stops", () => {
    const root = createTestRoot("demand");
    root.invalidate(3);
    expect(root.internal.frames).toBe(3);

    loop(0);
    loop(16);
    loop(32);
    loop(48);
    loop(64);

    expect(root.gl.calls.render.length).toBe(3);
    expect(root.internal.frames).toBe(0);
  });

  it("always mode renders on every loop tick regardless of the demand counter", () => {
    const root = createTestRoot("always");

    loop(0);
    loop(16);
    loop(32);

    expect(root.gl.calls.render.length).toBe(3);
  });

  it('"never" mode never renders from the automatic loop, only via advance()', () => {
    const root = createTestRoot("never");

    root.invalidate(); // no-op in "never" mode — frames never increments
    loop(0);
    loop(16);
    expect(root.gl.calls.render.length).toBe(0);
    expect(root.internal.frames).toBe(0);

    root.advance(32);
    expect(root.gl.calls.render.length).toBe(1);
  });

  it("a priority > 0 subscriber takes rendering over, skipping the root's own gl.render", () => {
    const root = createTestRoot("always");
    const seen: Array<[RootState, number]> = [];
    const unregister = root.frame((state, delta) => {
      seen.push([state, delta]);
    }, 1);

    root.advance(0);
    expect(root.gl.calls.render.length).toBe(0);
    expect(seen.length).toBe(1);
    expect(seen[0]?.[0]).toBe(root);

    unregister();
    root.advance(16);
    expect(root.gl.calls.render.length).toBe(1);
  });

  it("frame callbacks are invoked with (root, delta), sorted lowest to highest priority", () => {
    const root = createTestRoot("always");
    const order: number[] = [];
    root.frame(() => order.push(5), 5);
    root.frame(() => order.push(1), 1);
    root.frame(() => order.push(3), 3);

    let receivedRoot: RootState | undefined;
    let receivedDelta: number | undefined;
    root.frame((state, delta) => {
      receivedRoot = state;
      receivedDelta = delta;
    });

    root.advance(16);

    expect(order).toEqual([1, 3, 5]);
    expect(receivedRoot).toBe(root);
    expect(typeof receivedDelta).toBe("number");
  });

  it("an inactive root (internal.active = false) is skipped by the automatic loop", () => {
    const active = createTestRoot("always", true);
    const inactive = createTestRoot("always", false);

    loop(0);

    expect(active.gl.calls.render.length).toBe(1);
    expect(inactive.gl.calls.render.length).toBe(0);
  });

  it("invalidate() is a no-op once the root is torn down (active = false)", () => {
    const root = createTestRoot("demand", false);
    root.invalidate(1);
    expect(root.internal.frames).toBe(0);
  });

  it("global before/after effects run around advance(), gated by runGlobalCallbacks", () => {
    const root = createTestRoot("always");
    const before: number[] = [];
    const after: number[] = [];
    const unregisterBefore = addEffect((timestamp) => before.push(timestamp));
    const unregisterAfter = addAfterEffect((timestamp) =>
      after.push(timestamp),
    );

    root.advance(10, true);
    expect(before).toEqual([10]);
    expect(after).toEqual([10]);

    // runGlobalCallbacks = false skips both before/after effects entirely.
    root.advance(20, false);
    expect(before).toEqual([10]);
    expect(after).toEqual([10]);

    unregisterBefore();
    unregisterAfter();
    root.advance(30, true);
    expect(before).toEqual([10]);
    expect(after).toEqual([10]);
  });
});
