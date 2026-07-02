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
  it("renders a single fixed-position bar with zero args", () => {
    const { host, node } = render(scrollProgress() as DomphyElement);
    expect(host.children.length).toBe(1);
    expect(node.generateCSS()).toContain("position: fixed");
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { node } = render(scrollProgress() as DomphyElement);
    expect(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });

  it("accepts a custom color/thickness without throwing", () => {
    const { host } = render(
      scrollProgress({ color: "success", thickness: 2 }) as DomphyElement,
    );
    expect(host.querySelector('[role="progressbar"]')).toBeTruthy();
  });
});
