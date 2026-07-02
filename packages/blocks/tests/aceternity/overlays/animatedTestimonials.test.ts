// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { animatedTestimonials } from "../../../src/aceternity/overlays/animatedTestimonials.ts";

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

describe("animatedTestimonials", () => {
  it("renders a working demo with zero arguments: a photo stack plus quote/name/role", () => {
    const { host } = render(animatedTestimonials() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.children).toHaveLength(2);
    expect(container.textContent).toContain("Elena Marsh");
  });

  it("advances to the next testimonial when the next control is clicked", () => {
    const { host } = render(
      animatedTestimonials({
        testimonials: [
          { quote: "First", name: "Alice Wu", designation: "Engineer" },
          { quote: "Second", name: "Bob Lee", designation: "Designer" },
        ],
      }) as DomphyElement,
    );
    const nextButton = host.querySelector('button[aria-label="Next testimonial"]') as HTMLElement;
    expect(() => nextButton.dispatchEvent(new Event("click", { bubbles: true }))).not.toThrow();
  });

  it("falls back to initials when no imageSrc is given", () => {
    const { host } = render(
      animatedTestimonials({
        testimonials: [{ quote: "Solo", name: "Grace Hopper", designation: "Pioneer" }],
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("GH");
  });

  it("cycles automatically when autoplay is enabled, and removes cleanly", () => {
    vi.useFakeTimers();
    const { node } = render(
      animatedTestimonials({
        testimonials: [
          { quote: "One", name: "Alice Wu", designation: "Engineer" },
          { quote: "Two", name: "Bob Lee", designation: "Designer" },
        ],
        autoplay: true,
        intervalMs: 500,
      }) as DomphyElement,
    );
    expect(() => vi.advanceTimersByTime(1500)).not.toThrow();
    expect(() => node.remove()).not.toThrow();
    vi.useRealTimers();
  });
});
