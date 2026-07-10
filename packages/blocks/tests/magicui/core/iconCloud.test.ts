// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  easeOutCubic,
  focusRotationForPoint,
  iconCloud,
  rotatePoint,
} from "../../../src/magicui/core/iconCloud.ts";

// jsdom has no real 2D canvas backend (no `canvas` npm package installed), so
// `getContext("2d")` resolves to `null` and iconCloud()'s own guard bails out
// of the requestAnimationFrame loop — this only exercises structure, not motion.

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

describe("iconCloud", () => {
  it("renders a working demo tree with zero args: a square wrapper with a filled canvas", () => {
    const { host } = render(iconCloud() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("role")).toBe("img");
    expect(wrapper.querySelector("canvas")).toBeTruthy();
  });

  it("accepts custom icons, size, and image URLs without throwing", () => {
    expect(() =>
      render(
        iconCloud({
          size: 240,
          icons: [
            { image: "https://example.com/icon.png", label: "Example" },
            { glyphMarkup: "<svg/>" },
          ],
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("tears down cleanly on remove", () => {
    const { node } = render(iconCloud() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});

// The click-to-focus rotation is driven by wall-clock time inside the rAF loop,
// which jsdom can't meaningfully run (no real canvas, no compositor), so the
// *motion* is verified live via scripts (before/after-click screenshots). What
// IS unit-testable here is the pure math the interaction rests on: the tween's
// easing and the target-angle solver that decides where the sphere lands.
describe("iconCloud focus math", () => {
  it("easeOutCubic pins its endpoints and rises monotonically, front-loaded", () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 12);
    expect(easeOutCubic(1)).toBeCloseTo(1, 12);
    let previous = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const value = easeOutCubic(Math.min(1, t));
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    // ease-OUT decelerates: it's already well past halfway at the midpoint.
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it("focusRotationForPoint returns angles that rotate any point to screen-center", () => {
    const samples = [
      { x: 0.3, y: 0.4, z: Math.sqrt(1 - 0.3 ** 2 - 0.4 ** 2) },
      { x: -0.7, y: 0.1, z: Math.sqrt(1 - 0.7 ** 2 - 0.1 ** 2) },
      { x: 0, y: -1, z: 0 },
      { x: 0.5, y: 0.5, z: -Math.sqrt(1 - 0.5 ** 2 - 0.5 ** 2) },
      { x: -0.2, y: -0.9, z: Math.sqrt(1 - 0.2 ** 2 - 0.9 ** 2) },
    ];
    for (const point of samples) {
      const { yaw, pitch } = focusRotationForPoint(point);
      const rotated = rotatePoint(point, yaw, pitch);
      // Lands dead-center on screen (x=0, y=0). Depth (z) is NOT renormalized
      // to 1: rotatePoint's pitch step deliberately reuses the pre-pitch z
      // (matching upstream's own partial, non-orthonormal rotation), so the
      // landed depth is the point's original xz-plane radius — a point on
      // the equator (y=0) lands at full depth 1, but a point near the poles
      // lands shallower.
      const expectedDepth = Math.sqrt(point.x * point.x + point.z * point.z);
      expect(rotated.x).toBeCloseTo(0, 10);
      expect(rotated.y).toBeCloseTo(0, 10);
      expect(rotated.z).toBeCloseTo(expectedDepth, 10);
    }
  });
});

// Exercises the real interactive code path (which the structural tests above
// skip, since jsdom's getContext('2d') is null) by stubbing a minimal 2D
// context and a no-op rAF: a click-shaped pointer press must run the new
// hit-test + focus-start branch without throwing, and still tear down cleanly.
describe("iconCloud click-to-focus wiring", () => {
  it("handles a click on the canvas without throwing (stubbed 2D context)", () => {
    const canvasProto = HTMLCanvasElement.prototype as unknown as {
      getContext: (id: string) => unknown;
    };
    const originalGetContext = canvasProto.getContext;
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancelRaf = globalThis.cancelAnimationFrame;

    const fakeContext = {
      globalAlpha: 1,
      setTransform() {},
      clearRect() {},
      drawImage() {},
    };
    canvasProto.getContext = () => fakeContext;
    // Keep the render loop from actually spinning under the test runner.
    globalThis.requestAnimationFrame = (() =>
      1) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

    try {
      const { host, node } = render(iconCloud({ size: 300 }) as DomphyElement);
      const canvas = host.querySelector("canvas");
      expect(canvas).toBeTruthy();

      const down = new MouseEvent("pointerdown", {
        clientX: 150,
        clientY: 150,
        bubbles: true,
      });
      const up = new MouseEvent("pointerup", {
        clientX: 150,
        clientY: 150,
        bubbles: true,
      });
      expect(() => {
        canvas?.dispatchEvent(down);
        window.dispatchEvent(up);
      }).not.toThrow();

      expect(() => node.remove()).not.toThrow();
    } finally {
      canvasProto.getContext = originalGetContext;
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancelRaf;
    }
  });
});
