// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { cardHoverEffect } from "../../../src/aceternity/cards/cardHoverEffect.ts";

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

describe("cardHoverEffect", () => {
  it("renders a working demo with zero args: a hidden highlight panel plus one link card per item", () => {
    const { host, node } = render(cardHoverEffect() as DomphyElement);
    const grid = host.firstElementChild as HTMLElement;
    const cards = grid.querySelectorAll("a");
    expect(cards.length).toBe(6);
    expect(cards[0].querySelector("h3")?.textContent).toBeTruthy();
    // The highlight panel is the grid's first child, starting invisible
    // (declarative `opacity: 0`, compiled into the generated CSS class rule).
    const highlight = grid.firstElementChild as HTMLElement;
    expect(highlight.tagName).toBe("DIV");
    expect(node.generateCSS()).toContain("opacity: 0");
  });

  it("hovering a card positions and fades in the shared highlight panel", () => {
    const { host } = render(cardHoverEffect() as DomphyElement);
    const grid = host.firstElementChild as HTMLElement;
    const highlight = grid.firstElementChild as HTMLElement;
    const firstCard = grid.querySelectorAll("a")[0] as HTMLElement;

    firstCard.dispatchEvent(new MouseEvent("pointerenter", { clientX: 10, clientY: 10 }));

    expect(highlight.style.opacity).toBe("1");
    expect(highlight.style.transform).toContain("translate(");
  });

  it("leaving the whole grid fades the highlight back out", () => {
    const { host } = render(cardHoverEffect() as DomphyElement);
    const grid = host.firstElementChild as HTMLElement;
    const highlight = grid.firstElementChild as HTMLElement;
    const firstCard = grid.querySelectorAll("a")[0] as HTMLElement;

    firstCard.dispatchEvent(new MouseEvent("pointerenter", { clientX: 10, clientY: 10 }));
    expect(highlight.style.opacity).toBe("1");

    grid.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    expect(highlight.style.opacity).toBe("0");
  });

  it("respects a custom items array", () => {
    const { host } = render(
      cardHoverEffect({ items: [{ title: "Only", description: "One card" }] }) as DomphyElement,
    );
    expect(host.querySelectorAll("a").length).toBe(1);
    expect(host.querySelector("h3")?.textContent).toBe("Only");
  });
});
