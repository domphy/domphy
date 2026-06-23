// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transitionGroup } from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  // jsdom getBoundingClientRect returns all-zero rects, so the FLIP delta check
  // would short-circuit. Stub it to return distinct positions per element so an
  // animation (timer + transitionend listener) is actually scheduled.
  let counter = 0;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      counter += 1;
      return {
        left: counter * 40,
        top: counter * 40,
        right: 0,
        bottom: 0,
        width: 10,
        height: 10,
        x: counter * 40,
        y: counter * 40,
        toJSON() {},
      } as DOMRect;
    },
  );
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("transitionGroup", () => {
  it("renders the host container and its children", () => {
    const { host } = render({
      ul: [
        { li: "A", _key: "a" },
        { li: "B", _key: "b" },
      ],
      $: [transitionGroup()],
    } as DomphyElement);
    expect(host.querySelectorAll("li").length).toBe(2);
  });

  it("schedules a FLIP animation when children reorder", () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const items = toState([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    render({
      ul: (l) => items.get(l).map((i) => ({ li: i.name, _key: i.id })),
      $: [transitionGroup({ duration: 100 })],
    } as DomphyElement);

    setTimeoutSpy.mockClear();
    items.set([
      { id: "b", name: "B" },
      { id: "a", name: "A" },
    ]);
    flushSync();
    // At least one fallback finish-timer was scheduled for the moved element(s).
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("clears pending timers and listeners when removed mid-animation", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const cancelFrameSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const removeListenerSpy = vi.spyOn(
      HTMLElement.prototype,
      "removeEventListener",
    );

    const items = toState([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    const { node } = render({
      div: [
        {
          ul: (l) => items.get(l).map((i) => ({ li: i.name, _key: i.id })),
          $: [transitionGroup({ duration: 100 })],
        },
      ],
    } as DomphyElement);

    // Reorder to kick off an in-flight animation (timer + rAF + listener).
    items.set([
      { id: "b", name: "B" },
      { id: "a", name: "A" },
    ]);
    flushSync();

    clearTimeoutSpy.mockClear();
    cancelFrameSpy.mockClear();
    removeListenerSpy.mockClear();

    // Removing the container while animations are pending must not throw and
    // must tear down the scheduled timer, rAF and transitionend listener.
    expect(() => node.remove()).not.toThrow();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(cancelFrameSpy).toHaveBeenCalled();
    expect(
      removeListenerSpy.mock.calls.some(([type]) => type === "transitionend"),
    ).toBe(true);
  });

  it("does not throw when the fallback timer fires after removal", () => {
    vi.useFakeTimers();
    const items = toState([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    const { node } = render({
      div: [
        {
          ul: (l) => items.get(l).map((i) => ({ li: i.name, _key: i.id })),
          $: [transitionGroup({ duration: 100 })],
        },
      ],
    } as DomphyElement);

    items.set([
      { id: "b", name: "B" },
      { id: "a", name: "A" },
    ]);
    flushSync();

    node.remove();
    // Drain any timers that the patch may have left behind; cleared timers are
    // a no-op, so this must complete without touching the detached DOM.
    expect(() => vi.runAllTimers()).not.toThrow();
  });
});
