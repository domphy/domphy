// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  createFloating,
  type ElementRects,
  type Platform,
  type ReferenceElement,
} from "../src/index";

/**
 * Flushes pending microtasks (including chained `.then()`s several levels
 * deep, e.g. the real DOM platform's nested `await`s) by yielding to a
 * macrotask.
 */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function rectsAt(x: number): ElementRects {
  // Zero width/height collapses computeCoordsFromPlacement to `x`/`y` of the
  // reference rect, so the resolved `position.x` directly reflects `x` here.
  return {
    reference: { x, y: 0, width: 0, height: 0 },
    floating: { x: 0, y: 0, width: 0, height: 0 },
  };
}

interface PendingRectsCall {
  reference: ReferenceElement;
  resolve: (rects: ElementRects) => void;
}

/**
 * A `Platform` whose `getElementRects` never resolves on its own — the test
 * resolves each pending call explicitly, so it can control the ordering of
 * concurrent `computePosition` calls started by overlapping `connect()`s.
 */
function createControllablePlatform(): {
  calls: Array<PendingRectsCall>;
  platform: Platform;
} {
  const calls: Array<PendingRectsCall> = [];
  const platform: Platform = {
    getElementRects: ({ reference }) =>
      new Promise<ElementRects>((resolve) => {
        calls.push({ reference, resolve });
      }),
    getClippingRect: async () => ({ x: 0, y: 0, width: 2000, height: 2000 }),
    getDimensions: async () => ({ width: 0, height: 0 }),
  };
  return { calls, platform };
}

describe("createFloating", () => {
  it("connects, notifies onUpdate listeners, and exposes the position getter", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    const handle = createFloating({ placement: "bottom" });
    const received: Array<number> = [];
    handle.onUpdate((position) => {
      received.push(position.x);
    });

    handle.connect(reference, floating);
    await flush();

    expect(received.length).toBeGreaterThan(0);
    expect(handle.position).not.toBeNull();
    expect(handle.position?.placement).toBeDefined();

    handle.disconnect();
    reference.remove();
    floating.remove();
  });

  it("onUpdate returns an unsubscribe function that removes the listener", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    const handle = createFloating();
    let calls = 0;
    const unsubscribe = handle.onUpdate(() => {
      calls++;
    });

    handle.connect(reference, floating);
    await flush();
    expect(calls).toBeGreaterThan(0);

    unsubscribe();
    const callsAfterUnsubscribe = calls;

    // A subsequent scroll tick would normally trigger another update; here we
    // just re-invoke connect() to force another computePosition round trip.
    handle.connect(reference, floating);
    await flush();
    expect(calls).toBe(callsAfterUnsubscribe);

    handle.disconnect();
    reference.remove();
    floating.remove();
  });

  it("stops notifying listeners after disconnect()", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    const handle = createFloating();
    let calls = 0;
    handle.onUpdate(() => {
      calls++;
    });

    handle.connect(reference, floating);
    await flush();
    expect(calls).toBeGreaterThan(0);

    handle.disconnect();
    const callsAfterDisconnect = calls;

    // Dispatch a scroll event on an overflow ancestor — with autoUpdate torn
    // down this must not schedule another computePosition call.
    window.dispatchEvent(new Event("resize"));
    await flush();
    expect(calls).toBe(callsAfterDisconnect);

    reference.remove();
    floating.remove();
  });

  it("ignores a stale computation for a previous reference/floating pair after connect() retargets", async () => {
    const referenceA = document.createElement("div");
    const floatingA = document.createElement("div");
    const referenceB = document.createElement("div");
    const floatingB = document.createElement("div");
    document.body.append(referenceA, floatingA, referenceB, floatingB);

    const { calls, platform } = createControllablePlatform();
    const handle = createFloating({ platform, placement: "bottom" });
    const positions: Array<number> = [];
    handle.onUpdate((position) => {
      positions.push(position.x);
    });

    handle.connect(referenceA, floatingA);
    // Let A's computePosition calls reach `getElementRects` (they stay
    // pending — the controllable platform never auto-resolves).
    await flush();
    const staleCallsForA = calls.filter(
      (call) => call.reference === referenceA,
    );
    expect(staleCallsForA.length).toBeGreaterThan(0);

    // Retarget before any of A's computePosition calls resolve.
    handle.connect(referenceB, floatingB);
    await flush();

    // Resolve the stale A calls — they must be dropped because
    // currentReference/currentFloating already moved on to B.
    for (const call of staleCallsForA) {
      call.resolve(rectsAt(999));
    }
    await flush();
    expect(positions).toEqual([]);

    const freshCallsForB = calls.filter(
      (call) => call.reference === referenceB,
    );
    expect(freshCallsForB.length).toBeGreaterThan(0);
    for (const call of freshCallsForB) {
      call.resolve(rectsAt(1));
    }
    await flush();

    expect(positions.length).toBeGreaterThan(0);
    expect(positions.every((x) => x === 1)).toBe(true);
    expect(handle.position?.x).toBe(1);

    handle.disconnect();
    referenceA.remove();
    floatingA.remove();
    referenceB.remove();
    floatingB.remove();
  });
});
