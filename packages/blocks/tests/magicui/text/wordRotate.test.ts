// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { wordRotate } from "../../../src/magicui/text/wordRotate.ts";

// jsdom has no Web Animations API (`Element.prototype.animate`), so
// motion()'s enter/exit both become synchronous no-ops here — this still
// exercises the word-swap interval/state machine and DOM structure, just
// not the actual WAAPI slide/fade tween.

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

describe("wordRotate", () => {
  it("renders a working demo with zero args: exactly one word visible at a time", () => {
    const { host } = render(wordRotate() as DomphyElement);
    flushSync();
    expect(host.textContent).toBe("better");
  });

  it("rotates to the next word on the interval timer, wrapping back to the first", () => {
    vi.useFakeTimers();
    const { host } = render(wordRotate({ words: ["One", "Two"], duration: 500 }) as DomphyElement);
    flushSync();
    expect(host.textContent).toBe("One");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.textContent).toBe("Two");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.textContent).toBe("One");
  });

  it("accepts a single word without throwing (no timer needed)", () => {
    expect(() => render(wordRotate({ words: ["Solo"] }) as DomphyElement)).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(wordRotate() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
