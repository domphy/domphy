// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { ditherShader } from "../../../src/aceternity/overlays/ditherShader.ts";

// jsdom has no real 2D canvas backend (no `canvas` npm package installed),
// so the component's own `getContext("2d")` guard bails out before the
// sampling/redraw loop starts — this only exercises structure, not the
// actual dither drawing.

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

describe("ditherShader", () => {
  it("renders a working demo with zero arguments: a single canvas in a sized wrapper", () => {
    const { host } = render(ditherShader() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("role")).toBe("img");
    const canvas = wrapper.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });

  it("accepts every dither/color mode combination without throwing", () => {
    for (const ditherMode of ["bayer", "halftone", "noise", "crosshatch"] as const) {
      for (const colorMode of ["grayscale", "original", "duotone", "custom"] as const) {
        expect(() =>
          render(
            ditherShader({
              ditherMode,
              colorMode,
              primaryColor: "primary",
              secondaryColor: "secondary",
              gridSize: 6,
              threshold: 0.4,
              brightness: 0.1,
              contrast: -0.1,
            }) as DomphyElement,
          ),
        ).not.toThrow();
        document.body.innerHTML = "";
      }
    }
  });

  it("supports the animated mode and removes cleanly without throwing", () => {
    const { node } = render(ditherShader({ animated: true, animationSpeed: 2 }) as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
