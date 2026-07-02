// @vitest-environment jsdom

// jsdom has no real 2D canvas backend (no `canvas` npm package installed),
// so the component's own `getContext("2d")` guard bails out before the wave
// draw loop starts — this only exercises structure, not motion.

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { wavyBackground } from "../../../src/aceternity/backgrounds/wavyBackground.ts";

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

describe("wavyBackground", () => {
  it("renders a working demo with zero arguments: a canvas layer plus demo heading content", () => {
    const { host } = render(wavyBackground() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.getAttribute("data-tone")).toBe("shift-17");
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Wavy Background");
  });

  it("accepts custom colors, speed, and children without throwing", () => {
    expect(() =>
      render(
        wavyBackground({
          colors: ["primary", "danger"],
          waveWidth: 30,
          speed: "fast",
          waveOpacity: 0.8,
          children: { p: "Custom content" } as DomphyElement,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(wavyBackground() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
