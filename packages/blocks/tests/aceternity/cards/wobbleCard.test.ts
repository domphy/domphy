// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { wobbleCard } from "../../../src/aceternity/cards/wobbleCard.ts";

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

describe("wobbleCard", () => {
  it("renders a working demo with zero args: content wrapper plus a grain overlay", () => {
    const { host } = render(wobbleCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    expect(card.children).toHaveLength(2); // content wrapper + noise overlay
    expect(card.querySelector("h3")?.textContent).toBeTruthy();
  });

  it("omits the grain overlay when noise:false", () => {
    const { host } = render(wobbleCard({ noise: false }) as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    expect(card.children).toHaveLength(1);
  });

  it("moving the pointer translates and scales the content layer toward the cursor", () => {
    const { host } = render(wobbleCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const content = card.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 40, bubbles: true }));

    expect(content.style.transform).toContain("translate(");
    expect(content.style.transform).toContain("scale(1.03)");
  });

  it("leaving the card eases the content back to rest", () => {
    const { host } = render(wobbleCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const content = card.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 40, bubbles: true }));
    card.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

    expect(content.style.transform).toBe("translate(0, 0) scale(1)");
  });
});
