// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { bentoGrid } from "../../../src/magicui/core/bentoGrid.js";

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

describe("bentoGrid", () => {
  it("renders a working demo with zero arguments (five mosaic cards)", () => {
    const { host } = render(bentoGrid());
    const grid = host.firstElementChild!;
    expect(grid.children.length).toBe(5);
    expect(host.textContent).toContain("Ship faster");
    expect(host.querySelectorAll("h3").length).toBe(5);
    expect(host.querySelectorAll("a").length).toBe(5);
  });

  it("accepts custom cards with column/row spans and hrefs", () => {
    const cards = [
      {
        title: "Alpha",
        description: "First card",
        href: "/alpha",
        columnSpan: 2,
      },
      { title: "Beta", description: "Second card", href: "/beta" },
    ];
    const { host } = render(bentoGrid({ cards, columns: 2 }));
    expect(host.querySelectorAll("h3").length).toBe(2);
    const links = Array.from(host.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/alpha",
      "/beta",
    ]);
  });
});
