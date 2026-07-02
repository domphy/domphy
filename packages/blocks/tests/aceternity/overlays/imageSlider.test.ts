// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { imageSlider } from "../../../src/aceternity/overlays/imageSlider.ts";

// jsdom has no IntersectionObserver, so imageSlider()'s own guard starts the
// autoplay interval immediately — this lets the fake-timer test below
// exercise the actual slide-advance path, not just structure.

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

describe("imageSlider", () => {
  it("renders a working demo with zero arguments: image layer, overlay, and centered content", () => {
    const { host } = render(imageSlider() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.textContent).toContain("Explore the World");
    // image layer + overlay + content layer
    expect(container.children.length).toBeGreaterThanOrEqual(3);
  });

  it("omits the overlay layer when overlay is false", () => {
    const { host } = render(imageSlider({ overlay: false }) as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container.children).toHaveLength(2);
  });

  it("advances slides on autoplay and via keyboard navigation without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(
      imageSlider({
        images: ["a.png", "b.png", "c.png"],
        intervalMs: 1000,
      }) as DomphyElement,
    );
    expect(() => vi.advanceTimersByTime(2500)).not.toThrow();
    expect(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })),
    ).not.toThrow();
    expect(() => node.remove()).not.toThrow();
    vi.useRealTimers();
  });
});
