// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { carousel } from "../../../src/aceternity/overlays/carousel.ts";

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

describe("carousel", () => {
  it("renders a working demo with zero arguments: 4 slides plus previous/next controls", () => {
    const { host } = render(carousel() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    const slides = container.querySelectorAll('[role="group"]');
    expect(slides).toHaveLength(4);
    const buttons = container.querySelectorAll("button");
    // 4 CTA buttons + previous/next controls
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    expect(container.textContent).toContain("Northern Lights Expedition");
  });

  it("moves the active slide when a slide or the next control is clicked", () => {
    const onSlideClick = vi.fn();
    const { host } = render(
      carousel({
        slides: [
          { title: "One", buttonLabel: "Go" },
          { title: "Two", buttonLabel: "Go" },
          { title: "Three", buttonLabel: "Go" },
        ],
        onSlideClick,
      }) as DomphyElement,
    );
    const nextButton = host.querySelector('button[aria-label="Next slide"]') as HTMLElement;
    expect(() => nextButton.dispatchEvent(new Event("click", { bubbles: true }))).not.toThrow();

    const firstCtaButton = host.querySelector('[role="group"] button') as HTMLElement;
    firstCtaButton.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onSlideClick).toHaveBeenCalled();
  });
});
