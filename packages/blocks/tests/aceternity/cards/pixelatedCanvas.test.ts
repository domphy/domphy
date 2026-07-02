// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { pixelatedCanvas } from "../../../src/aceternity/cards/pixelatedCanvas.ts";

// jsdom has no real 2D canvas backend (no `canvas` npm package installed),
// so the component's own `getContext("2d")` guard bails out before the
// sampling/redraw loop starts — this only exercises structure, not motion.

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

describe("pixelatedCanvas", () => {
  it("renders a working demo with zero arguments: a single canvas in a sized container", () => {
    const { host } = render(pixelatedCanvas() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(container.children).toHaveLength(1);
  });

  it("accepts custom distortion/shape/tint configuration without throwing", () => {
    expect(() =>
      render(
        pixelatedCanvas({
          distortionMode: "swirl",
          dotShape: "circle",
          grayscale: true,
          tintColor: "primary",
          jitter: 2,
          responsive: false,
          width: 300,
          height: 200,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(pixelatedCanvas() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
