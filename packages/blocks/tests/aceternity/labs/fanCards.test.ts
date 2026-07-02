// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { fanCards } from "../../../src/aceternity/labs/fanCards.ts";

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

describe("fanCards", () => {
  it("renders a working demo with zero args: a two-line headline over 4 stacked cards", () => {
    const { host } = render(fanCards() as DomphyElement);
    const hero = host.firstElementChild as HTMLElement;
    expect(hero.getAttribute("data-tone")).toBe("shift-17");

    const headline = hero.querySelector("h1") as HTMLElement;
    expect(headline.querySelectorAll("span").length).toBe(2);

    const cards = hero.querySelectorAll('[data-tone="shift-16"]');
    expect(cards.length).toBe(4);
  });

  it("hovering the hero fans the cards apart, and leaving restacks them", () => {
    const { host } = render(fanCards() as DomphyElement);
    const hero = host.firstElementChild as HTMLElement;
    const firstCard = hero.querySelectorAll('[data-tone="shift-16"]')[0] as HTMLElement;
    const restTransform = firstCard.style.transform;

    hero.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    expect(firstCard.style.transform).not.toBe(restTransform);

    hero.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    expect(firstCard.style.transform).toBe(restTransform);
  });
});
