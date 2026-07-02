// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { textRevealCard } from "../../../src/aceternity/text/textRevealCard.ts";

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

describe("textRevealCard", () => {
  it("renders a working demo with zero args: a dark card with 140 decorative stars and both text lines", () => {
    const { host } = render(textRevealCard() as DomphyElement);
    flushSync();

    const card = host.firstElementChild as HTMLElement;
    expect(card.getAttribute("data-tone")).toBe("shift-16");
    const stars = card.querySelectorAll('[aria-hidden="true"] > span');
    expect(stars.length).toBe(140);
    expect(card.textContent).toContain("Hover and drag across this card");
    expect(card.textContent).toContain("You just wiped away the mystery");
  });

  it("clips the revealed text layer instantly to the pointer's fraction across the card while hovering", () => {
    const { host } = render(textRevealCard({ text: "base", revealText: "reveal" }) as DomphyElement);
    flushSync();

    const card = host.firstElementChild as HTMLElement;
    const paragraphs = card.querySelectorAll("p");
    const revealedLayer = paragraphs[1] as HTMLElement;

    Object.defineProperty(card, "getBoundingClientRect", {
      value: () => ({ left: 0, right: 200, width: 200, top: 0, bottom: 100, height: 100 }),
      configurable: true,
    });

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, bubbles: true }));
    expect(revealedLayer.style.transition).toBe("none");
    expect(revealedLayer.style.clipPath).toBe("inset(0 50% 0 0)");

    card.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(revealedLayer.style.clipPath).toBe("inset(0 100% 0 0)");
    expect(revealedLayer.style.transition).toContain("400ms");
  });

  it("accepts a custom starCount and optional overlay children", () => {
    const { host } = render(textRevealCard({ starCount: 10, children: { p: "Overlay title" } }) as DomphyElement);
    flushSync();
    const card = host.firstElementChild as HTMLElement;
    expect(card.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(10);
    expect(card.textContent).toContain("Overlay title");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(textRevealCard() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
