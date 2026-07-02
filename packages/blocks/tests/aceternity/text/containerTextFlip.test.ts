// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { containerTextFlip } from "../../../src/aceternity/text/containerTextFlip.ts";

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

describe("containerTextFlip", () => {
  it("renders a working demo with zero args: a sentence with a badge showing the first word", () => {
    const { host } = render(containerTextFlip() as DomphyElement);
    flushSync();

    const paragraph = host.firstElementChild as HTMLElement;
    expect(paragraph.tagName).toBe("P");
    const badge = paragraph.querySelector("[data-tone]") as HTMLElement;
    expect(badge).toBeTruthy();
    expect(paragraph.textContent).toContain("faster");
    expect(paragraph.textContent).toContain("Ship your product");
  });

  it("respects a custom words list and startIndex", () => {
    const { host } = render(containerTextFlip({ words: ["alpha", "beta"], startIndex: 1 }) as DomphyElement);
    flushSync();
    expect(host.textContent).toContain("beta");
  });

  it("advances to the next word on the configured interval", () => {
    vi.useFakeTimers();
    const { host } = render(containerTextFlip({ words: ["one", "two", "three"], interval: 500 }) as DomphyElement);
    flushSync();
    expect(host.textContent).toContain("one");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.textContent).toContain("two");

    vi.advanceTimersByTime(500);
    flushSync();
    expect(host.textContent).toContain("three");
  });

  it("loops back to the first word after the last", () => {
    vi.useFakeTimers();
    const { host } = render(containerTextFlip({ words: ["one", "two"], interval: 300 }) as DomphyElement);
    flushSync();
    vi.advanceTimersByTime(300);
    flushSync();
    vi.advanceTimersByTime(300);
    flushSync();
    expect(host.textContent).toContain("one");
  });

  it("removes cleanly without throwing (timer + motion listeners released)", () => {
    vi.useFakeTimers();
    const { node } = render(containerTextFlip() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
