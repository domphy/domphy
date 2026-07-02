// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { dottedGlowBackground } from "../../../src/aceternity/backgrounds/dottedGlowBackground.js";

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

describe("dottedGlowBackground", () => {
  it("renders a working demo with zero arguments", () => {
    // jsdom has no real 2D canvas backend (no `canvas` npm package installed),
    // so the component's own `getContext("2d")` guard bails out of the
    // requestAnimationFrame loop — this only exercises structure, not motion.
    const { host } = render(dottedGlowBackground());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Dotted Glow Background");
  });

  it("accepts custom spacing/colors/vignette/children without throwing", () => {
    const { host } = render(
      dottedGlowBackground({
        spacing: 32,
        dotRadius: 2,
        dotColor: "neutral",
        glowColor: "secondary",
        layerOpacity: 0.5,
        vignette: false,
        minPulseSpeed: 0.6,
        maxPulseSpeed: 1.1,
        speedMultiplier: 1.5,
        width: 400,
        height: 240,
        children: { p: "Foreground copy" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Foreground copy");
  });
});
