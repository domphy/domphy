// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { globe3D } from "../../../src/aceternity/effects-3d/globe3D.ts";

// jsdom implements neither ResizeObserver nor a real WebGL context; globe3D()
// guards both (falls back to a static, inert canvas via a null `gl` check)
// so the render below exercises the real fallback path, not a mock.
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

describe("globe3D", () => {
  it("renders a working demo with zero arguments: labeled wrapper + canvas + marker avatars + tooltip", () => {
    const { host } = render(globe3D());
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("role")).toBe("img");

    // The canvas is created imperatively in `_onMount` (not a static Domphy
    // child), mirroring `magicui/core/globe.ts`'s own pattern for the same
    // parent-Mount-fires-before-children-render ordering reason.
    const canvas = wrapper.querySelector("canvas");
    expect(canvas).toBeTruthy();

    // 5 default markers + 1 tooltip element.
    const markerAvatars = wrapper.querySelectorAll(":scope > span");
    expect(markerAvatars.length).toBe(5);
    const tooltip = wrapper.querySelector('[data-tone="shift-17"]');
    expect(tooltip).toBeTruthy();
  });

  it("accepts custom markers, wireframe, and autoRotate=false without throwing", () => {
    expect(() =>
      render(
        globe3D({
          markers: [{ latitude: 10, longitude: 20, label: "Custom" }],
          wireframe: true,
          autoRotate: false,
        }),
      ),
    ).not.toThrow();
  });

  it("tears down cleanly on remove", () => {
    const { node } = render(globe3D());
    expect(() => node.remove()).not.toThrow();
  });

  it("marker pointer enter/leave and click dispatch without throwing (WebGL-less fallback path)", () => {
    const onMarkerHover = () => {};
    const onMarkerClick = () => {};
    const { host } = render(globe3D({ onMarkerHover, onMarkerClick }));
    const wrapper = host.firstElementChild as HTMLElement;
    const firstMarker = wrapper.querySelector(":scope > span") as HTMLElement;
    expect(firstMarker).toBeTruthy();
    expect(() => firstMarker.dispatchEvent(new MouseEvent("pointerenter", { bubbles: true }))).not.toThrow();
    expect(() => firstMarker.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }))).not.toThrow();
    expect(() => firstMarker.dispatchEvent(new MouseEvent("click", { bubbles: true }))).not.toThrow();
  });
});
