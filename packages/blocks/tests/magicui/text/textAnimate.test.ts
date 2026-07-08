// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { textAnimate } from "../../../src/magicui/text/textAnimate.ts";

// jsdom has no Web Animations API (`Element.prototype.animate`), so the
// per-segment enter/exit tweens become synchronous no-ops here unless a test
// stubs `animate` itself — this still exercises segmentation, keys, and the
// mount/view-trigger wiring, just not the actual WAAPI opacity/transform tween.

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
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
});

describe("textAnimate", () => {
  it("renders a working demo with zero args: sr-only full text + aria-hidden word segments", () => {
    const { host } = render(textAnimate() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("P");
    // Upstream marks each motion segment `aria-hidden` individually (no shared
    // wrapper around them), so the hidden reading is the concatenation of every
    // `[aria-hidden="true"]` segment's text, not a single container's text.
    const hiddenSegments = wrapper.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenSegments.length).toBeGreaterThan(1);
    const hiddenText = Array.from(hiddenSegments)
      .map((segment) => segment.textContent)
      .join("");
    expect(hiddenText).toBe("Domphy renders exactly what you write, nothing more.");
    expect(wrapper.textContent).toContain("Domphy renders exactly what you write, nothing more.");
  });

  it("splits into one span per grapheme when by: 'character', preserving order", () => {
    const { host } = render(textAnimate({ text: "Hi", by: "character", accessibility: false }) as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    const characterSpans = wrapper.querySelectorAll(":scope > span");
    expect(characterSpans).toHaveLength(2);
    expect(wrapper.textContent).toBe("Hi");
  });

  it("plays each segment's enter tween on mount when startOnView is not set", () => {
    const animateSpy = vi.fn().mockReturnValue({ finished: Promise.resolve() });
    (HTMLElement.prototype as unknown as { animate: typeof animateSpy }).animate = animateSpy;

    render(textAnimate({ text: "Hi", by: "character", accessibility: false }) as DomphyElement);
    flushSync();

    expect(animateSpy).toHaveBeenCalledTimes(2); // one per character
  });

  it("defers entrance tweens until scrolled into view when startOnView is set (no IntersectionObserver in jsdom)", () => {
    const originalIntersectionObserver = (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;

    // No IntersectionObserver support fails open and plays immediately rather
    // than never playing — same guard convention as this package's other
    // view-triggered blocks (blurFade, terminal, numberTicker).
    expect(() =>
      render(textAnimate({ text: "Hi", startOnView: true, accessibility: false }) as DomphyElement),
    ).not.toThrow();

    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = originalIntersectionObserver;
  });

  it("replays with fresh segments when `text` is a reactive State that changes", () => {
    const textState = toState("Hi");
    const { host } = render(textAnimate({ text: textState, by: "character", accessibility: false }) as DomphyElement);
    flushSync();
    expect((host.firstElementChild as HTMLElement).textContent).toBe("Hi");

    textState.set("Bye");
    flushSync();
    expect((host.firstElementChild as HTMLElement).textContent).toBe("Bye");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(textAnimate() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
