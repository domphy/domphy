// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { focusCards } from "../../../src/aceternity/cards/focusCards.ts";

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

describe("focusCards", () => {
  it("renders a working demo with zero args: one card per default item", () => {
    const { host } = render(focusCards() as DomphyElement);
    const row = host.firstElementChild as HTMLElement;
    const cards = row.children;
    expect(cards.length).toBe(4);
    expect((cards[0] as HTMLElement).querySelector("h3")?.textContent).toBe("Whitehaven Beach");
  });

  it("hovering a card scales it up and blurs its siblings", () => {
    const { host } = render(focusCards() as DomphyElement);
    const row = host.firstElementChild as HTMLElement;
    const [first, second] = Array.from(row.children) as HTMLElement[];

    first.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));

    expect(first.style.transform).toBe("scale(1.04)");
    expect(first.style.filter).toBe("blur(0) brightness(1)");
    expect(second.style.filter).toContain("blur(4px)");
  });

  it("leaving the row resets every card to its unblurred, unscaled state", () => {
    const { host } = render(focusCards() as DomphyElement);
    const row = host.firstElementChild as HTMLElement;
    const [first, second] = Array.from(row.children) as HTMLElement[];

    first.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    row.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));

    expect(first.style.transform).toBe("scale(1)");
    expect(second.style.filter).toBe("blur(0) brightness(1)");
  });

  it("clicking a card invokes onSelect with its index", () => {
    let selected = -1;
    const { host } = render(focusCards({ onSelect: (index) => (selected = index) }) as DomphyElement);
    const row = host.firstElementChild as HTMLElement;
    (row.children[2] as HTMLElement).click();
    expect(selected).toBe(2);
  });
});
