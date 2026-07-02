// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { diaTextReveal } from "../../../src/magicui/text/diaTextReveal.ts";

// jsdom has no IntersectionObserver, so diaTextReveal()'s own "fail open"
// fallback plays the sweep immediately on mount instead of waiting for a
// real viewport-entry signal.

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("diaTextReveal", () => {
  it("renders a working demo with zero args: a base text layer plus a gradient sweep layer", () => {
    const { host } = render(diaTextReveal() as DomphyElement);
    flushSync();

    const spans = host.querySelectorAll("span > span");
    expect(spans).toHaveLength(2);
    expect(spans[1].getAttribute("aria-hidden")).toBe("true");
    expect(host.textContent).toContain("Reveal Yourself");
  });

  it("cycles through a list of strings, swapping both layers' text together", () => {
    vi.useFakeTimers();
    const { host } = render(
      diaTextReveal({ children: ["One", "Two"], duration: 200, pauseBetween: 50, repeat: true }) as DomphyElement,
    );
    flushSync();
    expect(host.textContent).toContain("One");

    vi.advanceTimersByTime(200 + 50);
    flushSync();
    expect(host.textContent).toContain("Two");
  });

  it("reserves a fixed width when `reserveWidth` is set, sized to the longest item", () => {
    const { node } = render(diaTextReveal({ children: ["Hi", "A much longer phrase"], reserveWidth: true }) as DomphyElement);
    expect(node.generateCSS()).toContain("20ch");
  });

  it("removes cleanly without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(diaTextReveal() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
