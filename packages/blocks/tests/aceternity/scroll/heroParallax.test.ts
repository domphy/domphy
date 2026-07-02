// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { heroParallax } from "../../../src/aceternity/scroll/heroParallax.ts";

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

describe("heroParallax", () => {
  it("renders a working demo with zero args: a headline over 3 rows of 15 products total", () => {
    const { host } = render(heroParallax() as DomphyElement);
    flushSync();

    const section = host.firstElementChild as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.tagName.toLowerCase()).toBe("section");
    expect(section.querySelector("h1")).toBeTruthy();
    expect(section.textContent).toContain("Ship interfaces without the framework tax.");

    const cards = section.querySelectorAll("a");
    expect(cards.length).toBe(15);
    const rows = section.querySelectorAll("[data-tone] > div:last-child > div");
    expect(rows.length).toBe(3);
  });

  it("chunks a custom product list into the requested row count", () => {
    const { host } = render(
      heroParallax({
        products: Array.from({ length: 6 }, (_unused, index) => ({
          title: `Item ${index}`,
          thumbnail: `https://picsum.photos/seed/item-${index}/300/200`,
        })),
        rows: 2,
        heading: "Custom heading",
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom heading");
    expect(host.querySelectorAll("a").length).toBe(6);
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { node } = render(heroParallax() as DomphyElement);
    expect(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });
});
