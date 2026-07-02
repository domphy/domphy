// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { textHoverEffect } from "../../../src/aceternity/text/textHoverEffect.ts";

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

describe("textHoverEffect", () => {
  it("renders a working demo with zero args: an outline text copy and a masked gradient text copy", () => {
    const { host } = render(textHoverEffect() as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    expect(container.getAttribute("role")).toBe("img");
    expect(container.getAttribute("aria-label")).toBe("Domphy");

    const textElements = container.querySelectorAll("text");
    expect(textElements.length).toBe(2);
    expect(textElements[0].textContent).toBe("Domphy");
    expect(textElements[0].getAttribute("fill")).toBe("none");
    expect(textElements[1].getAttribute("mask")).toMatch(/^url\(#/);

    const circle = container.querySelector("mask circle");
    expect(circle).toBeTruthy();
  });

  it("dispatches pointermove/pointerleave without throwing and reveals on move", () => {
    const { host } = render(textHoverEffect({ text: "Hover" }) as DomphyElement);
    flushSync();
    const container = host.firstElementChild as HTMLElement;
    const circle = container.querySelector("mask circle") as SVGCircleElement;

    expect(() => {
      container.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 20, clientY: 15 }));
    }).not.toThrow();
    expect(circle.style.opacity).toBe("1");

    expect(() => {
      container.dispatchEvent(new Event("pointerleave"));
    }).not.toThrow();
    expect(circle.style.opacity).toBe("0");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(textHoverEffect() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
