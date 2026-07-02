// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sparklesText } from "../../../src/magicui/text/sparklesText.ts";

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

describe("sparklesText", () => {
  it("renders a working demo with zero args: text plus at least one sparkle seeded on mount", () => {
    const { host } = render(sparklesText() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.textContent).toContain("Sparkles");
    expect(wrapper.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1);
  });

  it("keeps roughly a constant sparkle population as the spawn interval ticks", () => {
    vi.useFakeTimers();
    const { host } = render(
      sparklesText({ sparkleCount: 4, cycleDuration: 400 }) as DomphyElement,
    );
    flushSync();
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1);

    vi.advanceTimersByTime(1000);
    flushSync();
    // Population stays bounded (roughly `sparkleCount`), never unbounded growth.
    expect(host.querySelectorAll("svg").length).toBeLessThanOrEqual(4);
  });

  it("accepts custom text, colors, and size range without throwing", () => {
    expect(() =>
      render(
        sparklesText({
          children: "Wow",
          colors: ["info", "success"],
          minSize: 1,
          maxSize: 2,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("removes cleanly and stops spawning further sparkles", () => {
    vi.useFakeTimers();
    const { host, node } = render(
      sparklesText({ sparkleCount: 4, cycleDuration: 400 }) as DomphyElement,
    );
    flushSync();
    node.remove();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    expect(host.children.length).toBe(0);
  });
});
