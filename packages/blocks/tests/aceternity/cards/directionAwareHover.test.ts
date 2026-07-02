// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { directionAwareHover } from "../../../src/aceternity/cards/directionAwareHover.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Stub a non-zero layout rect — jsdom otherwise reports all-zero rects, which
 * would make every entry point classify as the degenerate top-left corner. */
function stubRect(element: HTMLElement, rect: Partial<DOMRect>) {
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 200, bottom: 150, width: 200, height: 150, x: 0, y: 0, toJSON() {}, ...rect }) as DOMRect;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("directionAwareHover", () => {
  it("renders a working demo with zero args: image plus a hidden overlay panel", () => {
    const { host } = render(directionAwareHover() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    expect(card.querySelector("img")).toBeTruthy();
    expect(card.querySelector("h4")?.textContent).toBe("Whitehaven Beach");
  });

  it("entering from the left pans the image and slides the overlay in from the left", () => {
    const { host } = render(directionAwareHover() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    stubRect(card, {});

    // (0, 75) relative to a 200x150 card, i.e. the vertical mid-left edge.
    card.dispatchEvent(new MouseEvent("pointerenter", { clientX: 0, clientY: 75 }));

    const image = card.querySelector("img") as HTMLElement;
    expect(image.style.transform).toContain("translateX(3%)");
  });

  it("leaving the card fades the overlay back out and resets the image", () => {
    const { host } = render(directionAwareHover() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    stubRect(card, {});

    card.dispatchEvent(new MouseEvent("pointerenter", { clientX: 0, clientY: 75 }));
    card.dispatchEvent(new MouseEvent("pointerleave", {}));

    const image = card.querySelector("img") as HTMLElement;
    expect(image.style.transform).toBe("scale(1) translate(0, 0)");
  });

  it("accepts custom overlay content via children", () => {
    const { host } = render(
      directionAwareHover({ children: [{ small: "Custom caption" }] }) as DomphyElement,
    );
    expect(host.querySelector("small")?.textContent).toBe("Custom caption");
  });
});
