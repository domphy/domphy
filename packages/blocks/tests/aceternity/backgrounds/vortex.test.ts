// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { vortex } from "../../../src/aceternity/backgrounds/vortex.js";

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

describe("vortex", () => {
  it("renders a working demo with zero arguments", () => {
    // jsdom has no real 2D canvas backend (no `canvas` npm package installed),
    // so the component's own `getContext("2d")` guard bails out of the
    // requestAnimationFrame loop — this only exercises structure, not motion.
    const { host } = render(vortex());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Ambient CTA");
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("accepts custom particle/color/children config without throwing", () => {
    const { host } = render(
      vortex({
        particleCount: 50,
        baseHue: 300,
        baseRadius: 2,
        rangeRadius: 1,
        children: { h2: "Custom hero" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Custom hero");
  });
});
