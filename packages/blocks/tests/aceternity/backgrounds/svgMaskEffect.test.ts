// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { svgMaskEffect } from "../../../src/aceternity/backgrounds/svgMaskEffect.js";

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

describe("svgMaskEffect", () => {
  it("renders a working demo with zero arguments: a base layer and a masked reveal layer", () => {
    const { host } = render(svgMaskEffect());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("Move your cursor");
    expect(container.textContent).toContain("There it is");
    expect(container.children.length).toBe(2);
  });

  it("dispatches pointermove/enter/leave without throwing and accepts custom content", () => {
    const { host } = render(
      svgMaskEffect({
        baseContent: { p: "Dim layer" },
        revealContent: { p: "Vivid layer" },
        restingSize: 40,
        hoverSize: 200,
      }),
    );

    const container = host.firstElementChild! as HTMLElement;
    expect(container.textContent).toContain("Dim layer");
    expect(container.textContent).toContain("Vivid layer");

    container.dispatchEvent(new Event("pointerenter"));
    container.dispatchEvent(
      Object.assign(new Event("pointermove"), { clientX: 10, clientY: 10 }),
    );
    container.dispatchEvent(new Event("pointerleave"));
  });
});
