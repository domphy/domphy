// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { asciiArt } from "../../../src/aceternity/cards/asciiArt.ts";

// jsdom has no real 2D canvas backend (no `canvas` npm package installed),
// so `getContext("2d")` resolves to `null` and the component's own guard
// bails out before ever loading the image — this only exercises structure,
// not the sampling/reveal pipeline.

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

describe("asciiArt", () => {
  it("renders a working demo with zero arguments: dark card holding a hidden canvas + empty grid", () => {
    const { host } = render(asciiArt() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.getAttribute("data-tone")).toBe("shift-16");
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("accepts colored/matrix/custom-character configuration without throwing", () => {
    expect(() =>
      render(
        asciiArt({
          colored: true,
          revealStyle: "matrix",
          characters: " .oO@",
          columns: 40,
          invert: true,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(asciiArt() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
