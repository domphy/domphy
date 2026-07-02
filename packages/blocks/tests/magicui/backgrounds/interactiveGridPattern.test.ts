// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { interactiveGridPattern } from "../../../src/magicui/backgrounds/interactiveGridPattern.ts";

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

describe("interactiveGridPattern", () => {
  it("renders a working demo tree with zero args: a full grid of square cells", () => {
    const { host } = render(interactiveGridPattern({ squares: [4, 3] }) as DomphyElement);
    const svg = host.querySelector("svg") as SVGSVGElement;
    expect(svg).toBeTruthy();
    expect(svg.querySelectorAll("rect").length).toBe(12);
  });

  it("highlights only the cell under the pointer on mousemove, and clears on mouseleave", () => {
    const { host } = render(interactiveGridPattern({ squares: [2, 2], width: 40, height: 40 }) as DomphyElement);
    const svg = host.querySelector("svg") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 80,
      height: 80,
      right: 80,
      bottom: 80,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    svg.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10, bubbles: true }));
    const cells = Array.from(svg.querySelectorAll("rect")) as SVGRectElement[];
    const activeCells = cells.filter((cell) => cell.style.fill !== "transparent" && cell.style.fill !== "");
    expect(activeCells.length).toBe(1);

    svg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    const stillActive = cells.filter((cell) => cell.style.fill !== "transparent" && cell.style.fill !== "");
    expect(stillActive.length).toBe(0);
  });

  it("accepts custom content via children", () => {
    const { host } = render(interactiveGridPattern({ children: { span: "Custom overlay" } }) as DomphyElement);
    expect(host.textContent).toContain("Custom overlay");
  });
});
