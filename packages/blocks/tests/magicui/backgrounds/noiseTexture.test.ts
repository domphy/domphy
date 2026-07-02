// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { noiseTexture } from "../../../src/magicui/backgrounds/noiseTexture.ts";

// jsdom has no real 2D canvas backend (no `canvas` npm package installed), so
// `getContext("2d")` resolves to `null` and noiseTexture()'s own guard bails
// out of drawing — this only exercises structure, matching the same
// convention as iconCloud()'s test in this package.

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

describe("noiseTexture", () => {
  it("renders a working demo tree with zero args: a panel with an overlaid canvas grain layer", () => {
    const { host } = render(noiseTexture() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.querySelector("canvas")).toBeTruthy();
    expect(wrapper.textContent).toContain("Textured surface");
  });

  it("accepts custom content via children and tears down cleanly on remove", () => {
    const { host, node } = render(noiseTexture({ children: { span: "Custom overlay" } }) as DomphyElement);
    expect(host.textContent).toContain("Custom overlay");
    expect(() => node.remove()).not.toThrow();
  });
});
