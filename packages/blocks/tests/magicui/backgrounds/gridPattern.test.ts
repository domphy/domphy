// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { gridPattern } from "../../../src/magicui/backgrounds/gridPattern.js";

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

describe("gridPattern", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(gridPattern());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    const svg = container.querySelector("svg")!;
    expect(svg).toBeTruthy();
    expect(svg.querySelector("pattern")).toBeTruthy();
    // Default squares render as highlighted <rect> elements.
    expect(svg.querySelectorAll("rect").length).toBeGreaterThan(1);
    expect(container.textContent).toContain("Grid Pattern");
  });

  it("renders no highlighted squares when squares is empty, without throwing", () => {
    const { host } = render(gridPattern({ squares: [], width: 24, height: 24 }));

    const container = host.firstElementChild!;
    const svg = container.querySelector("svg")!;
    // Only the background rect (filled with the pattern) remains.
    expect(svg.querySelectorAll("rect").length).toBe(1);
  });
});
