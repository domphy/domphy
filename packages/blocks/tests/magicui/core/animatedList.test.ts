// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { animatedList } from "../../../src/magicui/core/animatedList.js";

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

describe("animatedList", () => {
  it("renders a working demo with zero arguments (seeds the first card on mount)", () => {
    const { host } = render(animatedList({ intervalDelay: 10_000 }));
    flushSync();

    const container = host.firstElementChild!;
    expect(container).toBeTruthy();
    // First notification card ([data-tone="shift-1"] on notificationEntry's
    // inner chrome) is inserted synchronously on mount.
    expect(container.querySelectorAll('[data-tone="shift-1"]').length).toBe(1);
    expect(host.textContent).toContain("ago");
  });

  it("streams new cards in on the interval timer and caps mounted cards at maxItems + a scroll buffer", () => {
    vi.useFakeTimers();
    const { host } = render(
      animatedList({
        intervalDelay: 100,
        maxItems: 2,
        items: [
          { icon: "🔔", color: "info", title: "One", time: "1m", description: "First" },
          { icon: "🔔", color: "success", title: "Two", time: "2m", description: "Second" },
          { icon: "🔔", color: "warning", title: "Three", time: "3m", description: "Third" },
        ],
      }),
    );
    flushSync();
    expect(host.querySelectorAll('[data-tone="shift-1"]').length).toBe(1);

    vi.advanceTimersByTime(550);
    flushSync();

    // 1 seed + 5 ticks = 6 insertions total, capped at maxItems(2) + 2 buffer = 4 mounted cards.
    expect(host.querySelectorAll('[data-tone="shift-1"]').length).toBe(4);
    expect(host.textContent).toContain("Three");
  });

  it("accepts a custom insertion direction without throwing", () => {
    expect(() => render(animatedList({ direction: "bottom", intervalDelay: 10_000 }))).not.toThrow();
  });
});
