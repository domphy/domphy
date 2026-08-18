// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
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
          {
            icon: "🔔",
            color: "info",
            title: "One",
            time: "1m",
            description: "First",
          },
          {
            icon: "🔔",
            color: "success",
            title: "Two",
            time: "2m",
            description: "Second",
          },
          {
            icon: "🔔",
            color: "warning",
            title: "Three",
            time: "3m",
            description: "Third",
          },
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
    expect(() =>
      render(animatedList({ direction: "bottom", intervalDelay: 10_000 })),
    ).not.toThrow();
  });
});

describe("animatedList — reused-node lifecycle", () => {
  it("keeps streamed cards and keeps inserting after an ancestor re-render", () => {
    vi.useFakeTimers();
    const items = [
      {
        icon: "🔔",
        color: "info" as const,
        title: "One",
        time: "1m",
        description: "First",
      },
      {
        icon: "🔔",
        color: "success" as const,
        title: "Two",
        time: "2m",
        description: "Second",
      },
    ];
    const refresh = toState(0);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({
      div: (listener: unknown) => {
        (refresh.get as (l: unknown) => number)(listener);
        return [
          animatedList({
            intervalDelay: 100,
            items,
            loop: false,
          }) as DomphyElement,
        ];
      },
    } as DomphyElement);
    node.render(host);
    flushSync();
    expect(host.querySelectorAll('[data-tone="shift-1"]').length).toBe(1);
    expect(host.textContent).toContain("One");

    refresh.set(1);
    flushSync();
    // Persisted feed must not reset to empty on a reused node.
    expect(host.querySelectorAll('[data-tone="shift-1"]').length).toBe(1);
    expect(host.textContent).toContain("One");

    vi.advanceTimersByTime(100);
    flushSync();
    expect(host.querySelectorAll('[data-tone="shift-1"]').length).toBe(2);
    expect(host.textContent).toContain("Two");
  });
});
