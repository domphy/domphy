// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { scrollProgress } from "../../../src/magicui/community/scrollProgress.ts";

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

describe("scrollProgress", () => {
  it("renders a single fixed-position bar with zero args and a resting fill", () => {
    const { host, node } = render(scrollProgress() as DomphyElement);
    expect(host.children.length).toBe(1);
    const css = node.generateCSS();
    expect(css).toContain("position: fixed");
    // Resting scale so no-scroll catalog cells still show the bar.
    expect(css).toMatch(/scaleX\(0\.42\)/);
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { node } = render(scrollProgress() as DomphyElement);
    expect(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });

  it("applies custom colors/thickness to the bar's style", () => {
    const { node } = render(
      scrollProgress({ colors: ["success"], thickness: 2 }) as DomphyElement,
    );
    const css = node.generateCSS();
    expect(css).toContain("calc(0.5em)");
    expect(css).toContain("var(--success-");
  });
});
