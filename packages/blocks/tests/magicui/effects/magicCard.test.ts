// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { magicCard } from "../../../src/magicui/effects/magicCard.ts";

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

describe("magicCard", () => {
  it("renders a working demo card with a border-spotlight glow layer by default", () => {
    const { host } = render(magicCard() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Magic Card");
    const card = host.firstElementChild as HTMLElement;
    expect(card.children).toHaveLength(2); // glow layer + content wrapper
  });

  it("moving the pointer updates the CSS custom properties and fades the glow in", () => {
    const { host } = render(magicCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const glow = card.firstElementChild as HTMLElement;

    card.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 42, clientY: 24, bubbles: true }),
    );

    expect(card.style.getPropertyValue("--magic-card-x")).toBe("42px");
    expect(card.style.getPropertyValue("--magic-card-y")).toBe("24px");
    expect(glow.style.opacity).toBe("1");
  });

  it("leaving the pointer fades the glow back out", () => {
    const { host } = render(magicCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const glow = card.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10, bubbles: true }));
    expect(glow.style.opacity).toBe("1");

    card.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(glow.style.opacity).toBe("0");
  });

  it("orb variant fades in to the configured orbOpacity", () => {
    const { host } = render(
      magicCard({ variant: "orb", orbOpacity: 0.65 }) as DomphyElement,
    );
    const card = host.firstElementChild as HTMLElement;
    const glow = card.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 5, clientY: 5, bubbles: true }));
    expect(glow.style.opacity).toBe("0.65");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(magicCard() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
