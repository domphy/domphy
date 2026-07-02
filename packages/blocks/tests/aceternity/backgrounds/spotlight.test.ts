// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { spotlight } from "../../../src/aceternity/backgrounds/spotlight.js";

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

describe("spotlight", () => {
  it("renders a working demo with zero arguments: a dark section with a glow layer and hero content", () => {
    const { host } = render(spotlight());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("Light from above");

    const glowElement = container.firstElementChild!;
    expect(glowElement.getAttribute("aria-hidden")).toBe("true");
  });

  it("accepts custom placement/color/children without throwing", () => {
    const { host } = render(
      spotlight({
        glowColor: "primary",
        right: 40,
        top: 10,
        rotation: 20,
        children: { p: "Custom hero copy" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.textContent).toContain("Custom hero copy");
  });
});
