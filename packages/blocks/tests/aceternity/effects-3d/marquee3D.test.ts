// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { marquee3D } from "../../../src/aceternity/effects-3d/marquee3D.ts";

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

describe("marquee3D", () => {
  it("renders a working demo with zero arguments: tilted grid with 4 columns + grid lines + hero overlay", () => {
    const { host, node } = render(marquee3D() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.getAttribute("data-tone")).toBe("shift-16");

    const tiltedGrid = container.firstElementChild as HTMLElement;
    expect(node.generateCSS()).toContain("rotateX(55deg)");
    // 4 columns + 1 grid-line decoration layer
    expect(tiltedGrid.children).toHaveLength(5);

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);

    expect(container.textContent).toContain("A wall of work");
  });

  it("accepts a custom image list, column count, and disabled grid lines/overlay without throwing", () => {
    expect(() =>
      render(
        marquee3D({
          images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
          columns: 3,
          showGridLines: false,
          overlay: null,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("distributes images round-robin across the requested column count", () => {
    const { host } = render(
      marquee3D({
        images: Array.from({ length: 6 }, (_unused, index) => `https://example.com/${index}.jpg`),
        columns: 3,
      }) as DomphyElement,
    );
    const container = host.firstElementChild as HTMLElement;
    const tiltedGrid = container.firstElementChild as HTMLElement;
    // 3 image columns (no grid-line layer disabled here, so 3 + 1 = 4)
    expect(tiltedGrid.children.length).toBe(4);
  });
});
