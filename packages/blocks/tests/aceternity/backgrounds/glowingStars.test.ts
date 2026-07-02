// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { glowingStars } from "../../../src/aceternity/backgrounds/glowingStars.js";

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

describe("glowingStars", () => {
  it("renders a working demo with zero arguments: an 18x6 star grid, title/description, and a corner icon button", () => {
    const { host } = render(glowingStars());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("Glowing Stars");

    const starGrid = container.firstElementChild!;
    expect(starGrid.children.length).toBe(18 * 6);

    const cornerButton = container.querySelector("button");
    expect(cornerButton).toBeTruthy();
    expect(cornerButton?.querySelector("svg")).toBeTruthy();
  });

  it("accepts a custom grid size, disabled hover, and custom children without throwing", () => {
    const { host } = render(
      glowingStars({
        columns: 6,
        rows: 3,
        idleStarCount: 2,
        disableHover: true,
        children: { p: "Custom card body" },
      }),
    );

    const container = host.firstElementChild!;
    const starGrid = container.firstElementChild!;
    expect(starGrid.children.length).toBe(6 * 3);
    expect(container.textContent).toContain("Custom card body");
  });
});
