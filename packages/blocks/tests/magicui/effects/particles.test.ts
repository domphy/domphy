// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
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
});
