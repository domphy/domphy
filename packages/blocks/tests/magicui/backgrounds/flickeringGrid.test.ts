// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { flickeringGrid } from "../../../src/magicui/backgrounds/flickeringGrid.js";

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

describe("flickeringGrid", () => {
  it("renders a working demo with zero arguments", () => {
    // jsdom has no real 2D canvas backend (no `canvas` npm package installed),
    // so the component's own `getContext("2d")` guard bails out of the
    // requestAnimationFrame loop — this only exercises structure, not motion.
    const { host } = render(flickeringGrid());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Flickering Grid");
  });

  it("accepts custom sizing/color/children without throwing", () => {
    const { host } = render(
      flickeringGrid({
        squareSize: 6,
        gridGap: 4,
        flickerChance: 0.5,
        maxOpacity: 0.6,
        color: "primary",
        width: 320,
        height: 200,
        children: { p: "Foreground copy" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(container.textContent).toContain("Foreground copy");
  });
});
