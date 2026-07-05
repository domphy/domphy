// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { pointerHighlight } from "../../../src/aceternity/effects-3d/pointerHighlight.ts";

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

describe("pointerHighlight", () => {
  it("renders a working demo with zero arguments: sentence + rectangle outline + pointer glyph", () => {
    const { host } = render(pointerHighlight() as DomphyElement);
    const paragraphElement = host.firstElementChild as HTMLElement;
    expect(paragraphElement).toBeTruthy();
    expect(paragraphElement.textContent).toContain("Scroll down to see");
    expect(paragraphElement.textContent).toContain("this phrase");

    const wrapper = paragraphElement.querySelector("span") as HTMLElement;
    expect(wrapper).toBeTruthy();
    const svgElements = wrapper.querySelectorAll("svg");
    expect(svgElements).toHaveLength(2);

    const rectangle = wrapper.querySelector("rect") as SVGRectElement;
    expect(rectangle).toBeTruthy();
    expect(rectangle.getAttribute("pathLength")).toBe("100");

    const pointerPath = wrapper.querySelector("svg path") as SVGPathElement;
    expect(pointerPath).toBeTruthy();
  });

  it("accepts a custom highlighted phrase and corner without throwing", () => {
    expect(() =>
      render(
        pointerHighlight({
          children: "the export button",
          pointerCorner: "top-left",
          color: "success",
          once: false,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("tears down its intersection observer cleanly on remove", () => {
    const { node } = render(pointerHighlight() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
