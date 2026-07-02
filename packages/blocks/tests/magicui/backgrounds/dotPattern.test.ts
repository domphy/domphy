// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { dotPattern } from "../../../src/magicui/backgrounds/dotPattern.js";

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

describe("dotPattern", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(dotPattern());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    const svg = container.querySelector("svg")!;
    expect(svg).toBeTruthy();
    // jsdom has no real layout engine (getBoundingClientRect is 0×0), so the
    // component falls back to a modest default grid — this only exercises
    // structure (dots get created imperatively), not real container sizing.
    expect(svg.querySelectorAll("circle").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Dot Pattern");
  });

  it("renders glow-mode dots with per-dot animation and a radial gradient, without throwing", () => {
    const { host } = render(dotPattern({ glow: true, color: "primary" }));

    const container = host.firstElementChild!;
    const svg = container.querySelector("svg")!;
    expect(svg.querySelector("radialGradient")).toBeTruthy();
    const firstDot = svg.querySelector("circle")!;
    expect(firstDot.getAttribute("fill")).toContain("url(#");
    expect(firstDot.style.animation).toBeTruthy();
  });
});
