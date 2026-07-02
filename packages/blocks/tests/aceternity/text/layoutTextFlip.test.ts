// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { layoutTextFlip } from "../../../src/aceternity/text/layoutTextFlip.ts";

// jsdom has no Web Animations API (`Element.prototype.animate`), so
// motion()'s enter/exit/reactive-animate all become synchronous no-ops here —
// this still exercises the word-swap interval/state machine and DOM
// structure, just not the actual WAAPI slide/fade/width tweens.

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

describe("layoutTextFlip", () => {
  it("renders a working demo with zero args: static lead-in text plus the first word in a badge", () => {
    const { host } = render(layoutTextFlip() as DomphyElement);
    flushSync();

    const heading = host.querySelector("h2");
    expect(heading).toBeTruthy();
    expect(heading!.textContent).toContain("Build with");
    expect(heading!.textContent).toContain("curious");
    expect(heading!.querySelector("[data-tone]")).toBeTruthy();
  });

  it("rotates to the next word on the interval timer, wrapping back to the first", () => {
    vi.useFakeTimers();
    const { host } = render(layoutTextFlip({ words: ["One", "Two"], duration: 500 }) as DomphyElement);
    flushSync();
    expect(host.textContent).toContain("One");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.textContent).toContain("Two");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.textContent).toContain("One");
  });

  it("accepts a single word without throwing (no timer needed)", () => {
    expect(() => render(layoutTextFlip({ words: ["Solo"] }) as DomphyElement)).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(layoutTextFlip() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
