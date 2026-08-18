// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { globe } from "../../../src/magicui/core/globe.js";

const { mockCreateGlobe, mockUpdate, mockDestroy } = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockDestroy = vi.fn();
  const mockCreateGlobe = vi.fn(() => ({
    update: mockUpdate,
    destroy: mockDestroy,
  }));
  return { mockCreateGlobe, mockUpdate, mockDestroy };
});
vi.mock("cobe", () => ({ default: mockCreateGlobe }));

// jsdom implements neither ResizeObserver nor WebGL; globe() guards both
// (falls back to a static canvas via try/catch around `createGlobe`) so the
// render below exercises the real fallback path, not a mock.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  mockCreateGlobe.mockClear();
  mockUpdate.mockClear();
  mockDestroy.mockClear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("globe", () => {
  it("renders a working demo with zero arguments (relative wrapper + filled canvas)", () => {
    const { host } = render(globe());

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("role")).toBe("img");
    // The canvas is created imperatively in `_onMount` (not a static Domphy
    // child), which sidesteps the parent-Mount-fires-before-children-render
    // ordering gotcha for canvas/WebGL integrations.
    const canvas = wrapper.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });

  it("accepts custom markers and draggable=false without throwing", () => {
    expect(() =>
      render(
        globe({
          draggable: false,
          markers: [{ latitude: 10, longitude: 20 }],
        }),
      ),
    ).not.toThrow();
  });

  it("tears down cleanly on remove", () => {
    const { node } = render(globe());
    expect(() => node.remove()).not.toThrow();
  });

  it("stops the rAF loop once the canvas is disconnected", () => {
    const pending: FrameRequestCallback[] = [];
    const raf = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        pending.push(callback);
        return pending.length;
      });

    try {
      const { host } = render(globe());
      flushSync();
      const canvas = host.querySelector("canvas") as HTMLCanvasElement;
      expect(canvas).toBeTruthy();
      expect(pending.length).toBeGreaterThan(0);

      const tick = pending[pending.length - 1];
      canvas.remove();
      pending.length = 0;
      tick(16);
      expect(pending.length).toBe(0);
    } finally {
      raf.mockRestore();
    }
  });

  it("does not start a second rAF loop after an ancestor re-render", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    try {
      const refresh = toState(0);
      const host = document.createElement("div");
      document.body.appendChild(host);
      const node = new ElementNode({
        div: (listener: unknown) => {
          (refresh.get as (l: unknown) => number)(listener);
          return [globe() as DomphyElement];
        },
      } as DomphyElement);
      node.render(host);
      flushSync();
      const callsAfterMount = raf.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThan(0);

      refresh.set(1);
      flushSync();
      expect(raf.mock.calls.length).toBe(callsAfterMount);
    } finally {
      raf.mockRestore();
    }
  });
});
