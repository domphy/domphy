// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { morphingText } from "../../../src/magicui/text/morphingText.ts";

// jsdom's requestAnimationFrame does not auto-advance, so the rAF morph loop
// never runs here — these assertions cover the seeded DOM structure (the two
// persistent phrase spans and the `#threshold` filter) rather than the live
// blur/opacity tween, which only runs in a real browser.

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
  it("renders a working demo with zero args: threshold filter + the two seeded phrase spans", () => {
    const { host, node } = render(morphingText() as DomphyElement);
    flushSync();

    // Upstream `#threshold` is a single feColorMatrix (steep alpha contrast),
    // with no blur baked into the filter graph.
    const filterElement = host.querySelector("filter");
    expect(filterElement).toBeTruthy();
    expect(filterElement!.querySelector("feColorMatrix")).toBeTruthy();
    expect(filterElement!.querySelector("feGaussianBlur")).toBeNull();

    const filterId = filterElement!.getAttribute("id");
    // Declarative `style:` objects compile to class-based CSS (not inline
    // `style="..."` attributes), so assert against the generated stylesheet.
    expect(node.generateCSS()).toContain(`url(#${filterId})`);

    // Two persistent spans: the current phrase and the next one.
    const spans = host.querySelectorAll("span");
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe("Build");
    expect(spans[1].textContent).toBe("Ship");
  });

  it("seeds both spans from the supplied phrase list (current + next)", () => {
    const { host } = render(
      morphingText({ phrases: ["One", "Two"] }) as DomphyElement,
    );
    flushSync();

    const spans = host.querySelectorAll("span");
    expect(spans[0].textContent).toBe("One");
    expect(spans[1].textContent).toBe("Two");
  });

  it("accepts a single phrase without throwing (no morph loop needed)", () => {
    expect(() =>
      render(morphingText({ phrases: ["Solo"] }) as DomphyElement),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(morphingText() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
