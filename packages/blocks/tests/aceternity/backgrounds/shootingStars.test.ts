// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { shootingStars } from "../../../src/aceternity/backgrounds/shootingStars.js";

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

describe("shootingStars", () => {
  it("renders a working demo with zero arguments: a 120-star SVG field, a shooting-star layer, and demo content", () => {
    const { host } = render(shootingStars());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("Shooting Stars");

    const backgroundLayer = container.querySelector("svg");
    expect(backgroundLayer).toBeTruthy();
    expect(backgroundLayer?.querySelectorAll("circle").length).toBe(120);
  });

  it("accepts a custom star count, twinkle/spawn timing, and colors without throwing", () => {
    const { host } = render(
      shootingStars({
        starCount: 20,
        twinklingProbability: 1,
        minSpawnDelayMs: 100,
        maxSpawnDelayMs: 200,
        trailColor: "primary",
        headColor: "warning",
        children: { p: "Custom night sky" },
      }),
    );

    const container = host.firstElementChild!;
    expect(container.querySelector("svg")?.querySelectorAll("circle").length).toBe(20);
    expect(container.textContent).toContain("Custom night sky");
  });
});
