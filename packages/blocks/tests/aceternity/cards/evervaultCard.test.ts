// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evervaultCard } from "../../../src/aceternity/cards/evervaultCard.ts";

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

describe("evervaultCard", () => {
  it("renders a working demo with zero arguments: character grid + title + 4 corner marks", () => {
    const { host } = render(evervaultCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.getAttribute("data-tone")).toBe("shift-16");
    expect(card.textContent).toContain("Hover me");

    // 22 x 13 default grid of single-character spans, plus the 4 corner "+" marks.
    const spans = card.querySelectorAll("span");
    expect(spans.length).toBeGreaterThanOrEqual(22 * 13);
  });

  it("tracks mouse position into CSS custom properties and shuffles characters without throwing", () => {
    vi.useFakeTimers();
    const { host, node } = render(evervaultCard({ columns: 4, rows: 3 }) as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    Object.defineProperty(card, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }),
    });

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 20, bubbles: true }));
    expect(card.style.getPropertyValue("--evervault-x")).toBe("50px");

    expect(() => vi.advanceTimersByTime(500)).not.toThrow();

    card.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(() => node.remove()).not.toThrow();
    vi.useRealTimers();
  });
});
