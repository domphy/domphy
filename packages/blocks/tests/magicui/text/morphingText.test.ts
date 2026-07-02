// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { morphingText } from "../../../src/magicui/text/morphingText.ts";

// jsdom has no Web Animations API (`Element.prototype.animate`), so
// motion()'s enter/exit both become synchronous no-ops here — this still
// exercises the phrase-swap state machine and DOM structure, just not the
// actual WAAPI opacity tween.

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

describe("morphingText", () => {
  it("renders a working demo with zero args: goo filter defs + the first phrase", () => {
    const { host, node } = render(morphingText() as DomphyElement);
    flushSync();

    const filterElement = host.querySelector("filter");
    expect(filterElement).toBeTruthy();
    expect(filterElement!.querySelector("feGaussianBlur")).toBeTruthy();
    expect(filterElement!.querySelector("feColorMatrix")).toBeTruthy();

    const filterId = filterElement!.getAttribute("id");
    // Declarative `style:` objects compile to class-based CSS (not inline
    // `style="..."` attributes), so assert against the generated stylesheet.
    expect(node.generateCSS()).toContain(`url(#${filterId})`);

    expect(host.querySelector("h2")?.textContent).toBe("Build");
  });

  it("morphs to the next phrase on the interval timer, looping back to the first", () => {
    vi.useFakeTimers();
    const { host } = render(
      morphingText({ phrases: ["One", "Two"], interval: 500 }) as DomphyElement,
    );
    flushSync();
    expect(host.textContent).toContain("One");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.querySelector("h2")?.textContent).toBe("Two");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.querySelector("h2")?.textContent).toBe("One");
  });

  it("accepts a single phrase without throwing (no timer needed)", () => {
    expect(() =>
      render(morphingText({ phrases: ["Solo"] }) as DomphyElement),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(morphingText() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
