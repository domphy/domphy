// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { retroGrid } from "../../../src/magicui/backgrounds/retroGrid.js";

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

describe("retroGrid", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(retroGrid());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    // Perspective wrapper > [floor plane, horizon overlay].
    const perspectiveWrapper = container.firstElementChild!;
    expect(perspectiveWrapper.children.length).toBe(2);
    expect(container.textContent).toContain("Retro Grid");
  });

  it("accepts custom angle/cellSize/opacity/children without throwing", () => {
    const { host } = render(
      retroGrid({
        angle: 45,
        cellSize: 40,
        opacity: 0.8,
        lightLineColor: "primary",
        darkLineColor: "primary",
        children: { p: "Foreground copy" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.textContent).toContain("Foreground copy");
  });
});
