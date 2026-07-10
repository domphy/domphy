// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { animatedGridPattern } from "../../../src/magicui/backgrounds/animatedGridPattern.js";

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

describe("animatedGridPattern", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(animatedGridPattern());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    const svg = container.querySelector("svg")!;
    expect(svg).toBeTruthy();
    expect(svg.querySelector("pattern")).toBeTruthy();
    // Default numSquares (50) animated cells render as data-flagged <rect>s.
    expect(svg.querySelectorAll("[data-animated-square]").length).toBe(50);
    expect(container.textContent).toContain("Animated Grid Pattern");
  });

  it("accepts a custom numSquares/duration without throwing", () => {
    const { host } = render(
      animatedGridPattern({
        numSquares: 12,
        duration: 2,
        repeatDelay: 0.2,
        color: "primary",
      }),
    );

    const container = host.firstElementChild!;
    const svg = container.querySelector("svg")!;
    expect(svg.querySelectorAll("[data-animated-square]").length).toBe(12);
  });
});
