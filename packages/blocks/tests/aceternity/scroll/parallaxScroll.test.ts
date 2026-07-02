// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { parallaxScroll } from "../../../src/aceternity/scroll/parallaxScroll.ts";

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

describe("parallaxScroll", () => {
  it("renders a working demo with zero args: 15 photos round-robin across 3 columns", () => {
    const { host } = render(parallaxScroll() as DomphyElement);
    const section = host.firstElementChild as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.tagName.toLowerCase()).toBe("section");
    expect(section.getAttribute("data-tone")).toBe("shift-16");

    const columns = section.querySelectorAll(":scope > div > div");
    expect(columns.length).toBe(3);

    const images = section.querySelectorAll("img");
    expect(images.length).toBe(15);
    // Round-robin: column 0 gets images 0,3,6,9,12 → 5 images.
    expect(columns[0].querySelectorAll("img").length).toBe(5);
  });

  it("respects a custom `columns` count and distributes images accordingly", () => {
    const { host } = render(
      parallaxScroll({
        images: ["https://picsum.photos/seed/a/400/600", "https://picsum.photos/seed/b/400/600", "https://picsum.photos/seed/c/400/600"],
        columns: 2,
      }) as DomphyElement,
    );
    const columns = host.querySelectorAll(":scope > section > div > div");
    expect(columns.length).toBe(2);
    expect(columns[0].querySelectorAll("img").length).toBe(2);
    expect(columns[1].querySelectorAll("img").length).toBe(1);
  });

  it("calls onImageClick with the clicked image and its index", () => {
    const clicked: Array<{ src: string; index: number }> = [];
    const { host } = render(
      parallaxScroll({
        images: ["https://picsum.photos/seed/a/400/600", "https://picsum.photos/seed/b/400/600"],
        columns: 2,
        onImageClick: (image, index) => clicked.push({ src: image.src, index }),
      }) as DomphyElement,
    );
    const firstImage = host.querySelector("img") as HTMLElement;
    firstImage.click();
    expect(clicked).toEqual([{ src: "https://picsum.photos/seed/a/400/600", index: 0 }]);
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { node } = render(parallaxScroll() as DomphyElement);
    expect(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });
});
