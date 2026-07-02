// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cardStack } from "../../../src/aceternity/cards/cardStack.ts";

// jsdom has no IntersectionObserver, so cardStack()'s own guard starts the
// auto-cycle interval immediately — this lets the fake-timer test below
// exercise the actual reorder path, not just structure.

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("cardStack", () => {
  it("renders a working demo with zero arguments: 4 stacked testimonial cards", () => {
    const { host } = render(cardStack() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.children).toHaveLength(4);
    expect(container.textContent).toContain("Maya Chen");
  });

  it("cycles the stack on its interval without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(
      cardStack({
        items: [
          { quote: "One", name: "Alice Wu", role: "Engineer" },
          { quote: "Two", name: "Bob Lee", role: "Designer" },
        ],
        intervalMs: 500,
      }) as DomphyElement,
    );
    expect(() => vi.advanceTimersByTime(1500)).not.toThrow();
    expect(() => node.remove()).not.toThrow();
    vi.useRealTimers();
  });

  it("falls back to initials when no avatarSrc is given", () => {
    const { host } = render(
      cardStack({ items: [{ quote: "Solo", name: "Grace Hopper", role: "Pioneer" }] }) as DomphyElement,
    );
    expect(host.textContent).toContain("GH");
  });
});
