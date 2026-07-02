// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { keyboard } from "../../../src/aceternity/cards/keyboard.ts";

// jsdom has no IntersectionObserver, so keyboard()'s own guard skips the
// visibility gate and attaches the real document keydown/keyup listeners
// immediately — this lets the dispatch test below exercise the actual
// event-handling path, not just structure.

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

describe("keyboard", () => {
  it("renders a working demo with zero arguments: keycap board + preview strip", () => {
    const { host } = render(keyboard() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();

    const tray = container.querySelector('[data-tone="shift-1"]');
    expect(tray).toBeTruthy();

    const keycaps = container.querySelectorAll("kbd");
    // 6 rows worth of keys, including the arrow cluster and the preview kbd.
    expect(keycaps.length).toBeGreaterThan(50);
    expect(container.textContent).toContain("return");
    expect(container.textContent).toContain("command");
  });

  it("omits the preview strip when showPreview is false", () => {
    const { host } = render(keyboard({ showPreview: false }) as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    // Only the tray's own kbd keys remain — no floating preview kbd above it.
    expect(container.children).toHaveLength(1);
  });

  it("mirrors real document keydown/keyup without throwing, including with sound enabled", () => {
    const { node } = render(keyboard({ playSound: true }) as DomphyElement);
    expect(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyQ" }));
      document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyQ" }));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });
});
