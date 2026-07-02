// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { backgroundGradient } from "../../../src/aceternity/backgrounds/backgroundGradient.js";

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

describe("backgroundGradient", () => {
  it("renders a working demo with zero arguments: a blurred glow layer behind a card", () => {
    const { host } = render(backgroundGradient());

    const container = host.firstElementChild!;
    expect(container.children.length).toBe(2);
    expect(container.textContent).toContain("Background Gradient");
  });

  it("accepts animate:false and custom children without throwing", () => {
    const { host } = render(
      backgroundGradient({
        animate: false,
        blurRadius: 12,
        duration: 3,
        children: { p: "Wrapped content" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.textContent).toContain("Wrapped content");
  });
});
