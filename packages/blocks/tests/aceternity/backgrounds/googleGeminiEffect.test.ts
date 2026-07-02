// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { googleGeminiEffect } from "../../../src/aceternity/backgrounds/googleGeminiEffect.js";

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

describe("googleGeminiEffect", () => {
  it("renders a working demo with zero arguments: 5 ribbons, each with a glow duplicate", () => {
    const { host } = render(googleGeminiEffect());

    const section = host.firstElementChild!;
    expect(section.getAttribute("data-tone")).toBeTruthy();
    expect(section.textContent).toContain("Build with Aceternity UI");

    const svg = section.querySelector("svg")!;
    expect(svg).toBeTruthy();
    // 5 default ribbons × 2 (glow duplicate + crisp path) = 10 <path> elements.
    expect(svg.querySelectorAll("path").length).toBe(10);
    for (const path of Array.from(svg.querySelectorAll("path"))) {
      expect(path.getAttribute("d")).toBeTruthy();
    }
  });

  it("accepts custom paths, explicit per-path progress, and glow:false without throwing", () => {
    const { host } = render(
      googleGeminiEffect({
        title: "Custom Hero Title",
        description: "Custom supporting line.",
        glow: false,
        paths: [
          { color: "primary", strokeWidth: 4 },
          { color: "error", d: "M0,50 C 100,10 200,90 300,50" },
        ],
        progress: [0.5, 1],
      }),
    );

    const section = host.firstElementChild!;
    expect(section.textContent).toContain("Custom Hero Title");
    expect(section.textContent).toContain("Custom supporting line.");

    const svg = section.querySelector("svg")!;
    // glow:false and 2 custom paths → exactly 2 <path> elements, no duplicates.
    expect(svg.querySelectorAll("path").length).toBe(2);
  });
});
