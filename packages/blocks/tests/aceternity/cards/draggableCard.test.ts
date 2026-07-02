// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { draggableCard } from "../../../src/aceternity/cards/draggableCard.ts";

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

describe("draggableCard", () => {
  it("renders a working demo with zero args: one polaroid card per default item", () => {
    const { host } = render(draggableCard() as DomphyElement);
    const bounds = host.firstElementChild as HTMLElement;
    expect(bounds.children.length).toBe(3);
    expect(bounds.querySelector("small")?.textContent).toBe("Prague, 2024");
  });

  it("dragging a card moves it (pointerdown + window pointermove updates left/top)", () => {
    const { host } = render(draggableCard() as DomphyElement);
    const bounds = host.firstElementChild as HTMLElement;
    const card = bounds.firstElementChild as HTMLElement;
    const initialLeft = card.style.left;

    card.dispatchEvent(new MouseEvent("pointerdown", { clientX: 20, clientY: 20, bubbles: true }));
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 90, clientY: 60 }));

    expect(card.style.left).not.toBe(initialLeft);
    expect(card.style.transform).toContain("rotate(");
  });

  it("releasing the pointer calls onDragEnd and starts settling back within bounds", () => {
    let dragEndId = "";
    const { host } = render(draggableCard({ onDragEnd: (id) => (dragEndId = id) }) as DomphyElement);
    const bounds = host.firstElementChild as HTMLElement;
    const card = bounds.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("pointerdown", { clientX: 20, clientY: 20, bubbles: true }));
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 90, clientY: 60 }));
    window.dispatchEvent(new MouseEvent("pointerup", {}));

    expect(dragEndId).toBe("polaroid-1");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(draggableCard() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
