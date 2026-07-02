// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { globe } from "../../../src/magicui/core/globe.js";

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
});
