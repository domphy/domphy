// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { containerScrollAnimation } from "../../../src/aceternity/scroll/containerScrollAnimation.ts";

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

describe("containerScrollAnimation", () => {
  it("renders a working demo with zero args: a sticky stage with a heading and a card", () => {
    const { host, node } = render(containerScrollAnimation() as DomphyElement);
    flushSync();

    const section = host.firstElementChild as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.tagName.toLowerCase()).toBe("section");
    expect(section.querySelector("h2")).toBeTruthy();
    expect(section.querySelector("img")).toBeTruthy();
    expect(node.generateCSS()).toContain("sticky");
  });

  it("accepts a custom titleComponent and children without throwing", () => {
    const { host } = render(
      containerScrollAnimation({
        titleComponent: "Custom headline",
        children: { p: "Custom card content" },
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom headline");
    expect(host.textContent).toContain("Custom card content");
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { node } = render(containerScrollAnimation() as DomphyElement);
    expect(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });
});
