// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { neonGradientCard } from "../../../src/magicui/community/neonGradientCard.ts";

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

describe("neonGradientCard", () => {
  it("renders a working demo card with a glow layer, a frame layer, and content on top", () => {
    const { host } = render(neonGradientCard() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Neon Gradient Card");
    expect(host.querySelector('[data-neon-glow="true"]')).toBeTruthy();
    // Three stacked layers: glow, frame, content.
    const wrapper = host.firstElementChild!;
    expect(wrapper.children.length).toBe(3);
  });

  it("accepts custom content and neon colors", () => {
    const { host } = render(
      neonGradientCard({
        children: { p: "Custom content" } as DomphyElement,
        neonColors: { firstColor: "success", secondColor: "warning" },
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom content");
  });

  it("keeps decorative layers out of the tab/click path (pointer-events: none)", () => {
    const { node } = render(neonGradientCard() as DomphyElement);
    expect(node.generateCSS()).toContain("pointer-events: none");
  });
});
