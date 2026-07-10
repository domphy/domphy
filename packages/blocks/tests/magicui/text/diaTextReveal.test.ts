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
  it("renders a working demo with zero args: a single gradient-clipped reveal span", () => {
    const { host } = render(diaTextReveal() as DomphyElement);
    flushSync();

    const span = host.querySelector("span") as HTMLElement;
    expect(span).toBeTruthy();
    expect(host.textContent).toContain("Reveal Yourself");
    // jsdom does have a real rAF, so `flushSync()` (synchronous, before any
    // frame ticks) still observes the pre-sweep resting frame — a
    // mostly-transparent gradient, not plain solid text.
    expect(span.style.backgroundImage).toContain("linear-gradient");
  });

  it("cycles through a list of strings, swapping the reveal span's text", () => {
    vi.useFakeTimers();
    const { host } = render(
      diaTextReveal({
        children: ["One", "Two"],
        duration: 200,
        pauseBetween: 50,
        repeat: true,
      }) as DomphyElement,
    );
    flushSync();
    expect(host.textContent).toContain("One");

    // The sweep is rAF-frame-quantized (~16ms steps under fake timers, and
    // the very first frame doesn't fire until the first 16ms tick either),
    // so it completes some frames AFTER `duration`, not at the exact
    // millisecond — a generous buffer accounts for that overshoot.
    vi.advanceTimersByTime(200 + 50 + 50);
    flushSync();
    expect(host.textContent).toContain("Two");
  });

  it("reserves a fixed width when `reserveWidth` is set, sized to the longest item", () => {
    // jsdom never lays out real geometry (getBoundingClientRect() is always
    // zeroed), so the block's real, upstream-faithful measurement technique —
    // cloning the span into a hidden ghost and reading its measured PIXEL
    // width (see `measureWidths`) — needs a stubbed rect to observe here.
    // Stub by text length so the two items resolve to distinct, checkable
    // widths and the "sized to the longest item" behavior stays meaningful.
    const originalGetBoundingClientRect =
      HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      return {
        width: (this.textContent ?? "").length * 10,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON() {},
      } as DOMRect;
    };
    try {
      // reserveWidth is applied imperatively in `_onMount` (`element.style.width
      // = ...`), not through the declarative `style` object, so it shows up on
      // the live DOM element rather than in `node.generateCSS()`.
      const { host } = render(
        diaTextReveal({
          children: ["Hi", "A much longer phrase"],
          reserveWidth: true,
        }) as DomphyElement,
      );
      const span = host.querySelector("span") as HTMLElement;
      // "A much longer phrase" (20 chars) is the longest item -> 200px reserved.
      expect(span.style.width).toBe("200px");
    } finally {
      HTMLElement.prototype.getBoundingClientRect =
        originalGetBoundingClientRect;
    }
  });

  it("removes cleanly without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(diaTextReveal() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
