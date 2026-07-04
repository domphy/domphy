// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { stickyScrollReveal } from "../../../src/aceternity/scroll/stickyScrollReveal.ts";

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

describe("stickyScrollReveal", () => {
  it("renders a working demo with zero args: 4 titles on the left, 4 stacked panel layers on the right", () => {
    const { host } = render(stickyScrollReveal() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();

    const titles = wrapper.querySelectorAll("h3");
    expect(titles.length).toBe(4);
    expect(titles[0].textContent).toBe("Reactive by default");

    const panelLayers = wrapper.querySelectorAll('[data-tone="shift-15"]');
    expect(panelLayers.length).toBe(4);
  });

  it("accepts custom content and does not throw", () => {
    const { host } = render(
      stickyScrollReveal({
        content: [
          { title: "Step one", description: "First step.", color: "warning" },
          { title: "Step two", description: "Second step.", node: { p: "Custom panel content" } },
        ],
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Step one");
    expect(host.textContent).toContain("Custom panel content");
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { host, node } = render(stickyScrollReveal() as DomphyElement);
    const root = host.firstElementChild as HTMLElement;
    expect(() => {
      root.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });

  it("is its own bounded, `overflow-y: auto` scroll box — not reliant on the page/an ancestor scrolling", () => {
    // Regression: `position: sticky` only sticks relative to its NEAREST
    // scrolling ancestor. A prior implementation listened on `window` and
    // relied on the whole document scrolling, which silently breaks the
    // instant this component is mounted inside ANY ancestor that itself
    // establishes a scroll container (e.g. `overflow: auto`) — that ancestor
    // becomes the "nearest scrolling ancestor" instead, and since it never
    // actually needs to scroll (it just grows to fit), the sticky panel
    // renders at its static resting position and never appears to stick.
    const { node } = render(stickyScrollReveal() as DomphyElement);
    const css = node.generateCSS();
    expect(css).toMatch(/overflow-y:\s*auto/);
    expect(css).toMatch(/[^-]height:\s*calc\([\d.]+(rem|em|px)\)/);
  });
});
