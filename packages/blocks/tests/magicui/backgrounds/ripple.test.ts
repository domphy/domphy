// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { ripple } from "../../../src/magicui/backgrounds/ripple.js";

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

describe("ripple", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(ripple());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    // Default numCircles (8) rings inside the masked rings wrapper.
    const ringsWrapper = container.firstElementChild!;
    expect(ringsWrapper.children.length).toBe(8);
    expect(container.textContent).toContain("Ripple");
  });

  it("accepts custom numCircles/mainCircleSize/children without throwing", () => {
    const { host } = render(
      ripple({
        numCircles: 4,
        mainCircleSize: 100,
        mainCircleOpacity: 0.4,
        color: "primary",
        children: { p: "Foreground copy" },
      }),
    );

    const container = host.firstElementChild!;
    const ringsWrapper = container.firstElementChild!;
    expect(ringsWrapper.children.length).toBe(4);
    expect(container.textContent).toContain("Foreground copy");
  });
});
