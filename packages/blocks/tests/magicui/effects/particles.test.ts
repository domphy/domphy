// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { particles } from "../../../src/magicui/effects/particles.js";

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

describe("particles", () => {
  it("renders a working demo with zero arguments", () => {
    // jsdom has no real 2D canvas backend (no `canvas` npm package installed),
    // so the component's own `getContext("2d")` guard bails out of the
    // requestAnimationFrame loop — this only exercises structure, not motion.
    const { host } = render(particles());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Particles");
  });

  it("accepts custom quantity/color/children without throwing", () => {
    const { host } = render(
      particles({
        quantity: 40,
        color: "primary",
        size: 2,
        children: { p: "Foreground copy" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Foreground copy");
  });

  it("resizes the canvas with setTransform, not compounding scale", () => {
    const setTransform = vi.fn();
    const scale = vi.fn();
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ({
      setTransform,
      scale,
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
    })) as typeof HTMLCanvasElement.prototype.getContext;
    try {
      render(particles({ quantity: 2 }));
      expect(setTransform).toHaveBeenCalled();
      expect(scale).not.toHaveBeenCalled();
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });

  it("does not start a second rAF loop after an ancestor re-render", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ({
      setTransform: () => {},
      scale: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
    })) as typeof HTMLCanvasElement.prototype.getContext;
    try {
      const refresh = toState(0);
      const host = document.createElement("div");
      document.body.appendChild(host);
      const node = new ElementNode({
        div: (listener: unknown) => {
          (refresh.get as (l: unknown) => number)(listener);
          return [particles({ quantity: 2 }) as DomphyElement];
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
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      raf.mockRestore();
    }
  });
});
