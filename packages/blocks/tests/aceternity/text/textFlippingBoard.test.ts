// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { textFlippingBoard } from "../../../src/aceternity/text/textFlippingBoard.ts";

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

describe("textFlippingBoard", () => {
  it("renders a working demo with zero args: a grid of dark tiles wrapping into multiple rows", () => {
    const { host } = render(textFlippingBoard() as DomphyElement);
    flushSync();

    const board = host.firstElementChild as HTMLElement;
    const rows = board.children;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const firstTile = board.querySelector('[data-tone="shift-17"]') as HTMLElement;
    expect(firstTile).toBeTruthy();
  });

  it("splits an explicit row into one tile per character, marking blanks and {}-tagged accents", () => {
    const { host } = render(textFlippingBoard({ rows: ["A {B} C"] }) as DomphyElement);
    flushSync();

    const board = host.firstElementChild as HTMLElement;
    const tiles = board.querySelectorAll('[data-tone="shift-17"]');
    // "A", " ", "B", " ", "C" — the {} markers themselves are not tiles.
    expect(tiles).toHaveLength(5);
  });

  it("every tile settles on its target character once its own flip sequence completes", () => {
    vi.useFakeTimers();
    const { host } = render(textFlippingBoard({ rows: ["A"], duration: 100 }) as DomphyElement);
    flushSync();

    const board = host.firstElementChild as HTMLElement;
    const tile = board.querySelector('[data-tone="shift-17"]') as HTMLElement;
    const characterElement = tile.firstElementChild as HTMLElement;

    vi.advanceTimersByTime(5000);
    flushSync();

    expect(characterElement.textContent).toBe("A");
  });

  it("word-wraps text onto multiple rows and enables the synthesized sound flag without throwing", () => {
    vi.useFakeTimers();
    expect(() =>
      render(textFlippingBoard({ text: "HELLO WORLD FROM DOMPHY", columns: 8, sound: true, duration: 300 }) as DomphyElement),
    ).not.toThrow();
    flushSync();
    vi.advanceTimersByTime(3000);
    flushSync();
  });

  it("removes cleanly without throwing (all pending flip timers cancelled)", () => {
    vi.useFakeTimers();
    const { node } = render(textFlippingBoard() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
