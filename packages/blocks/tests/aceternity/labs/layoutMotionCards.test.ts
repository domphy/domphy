// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { layoutMotionCards } from "../../../src/aceternity/labs/layoutMotionCards.ts";

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

describe("layoutMotionCards", () => {
  it("renders a working demo with zero args: 5 scattered cards, one per default item", () => {
    const { host } = render(layoutMotionCards() as DomphyElement);
    const scene = host.firstElementChild as HTMLElement;
    const cards = scene.children;
    expect(cards.length).toBe(5);
    expect((cards[0] as HTMLElement).getAttribute("aria-label")).toBe("Working Knowledge");
  });

  it("hovering a card expands it to the centered/scaled-up state, and leaving the scene resets it", () => {
    const { host } = render(layoutMotionCards() as DomphyElement);
    const scene = host.firstElementChild as HTMLElement;
    const first = scene.children[0] as HTMLElement;

    first.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    expect(first.style.left).toBe("50%");
    expect(first.style.transform).toContain("scale(1.8)");

    scene.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    expect(first.style.left).not.toBe("50%");
  });
});
