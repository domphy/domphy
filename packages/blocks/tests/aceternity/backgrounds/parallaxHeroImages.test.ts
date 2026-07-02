// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { parallaxHeroImages } from "../../../src/aceternity/backgrounds/parallaxHeroImages.ts";

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

describe("parallaxHeroImages", () => {
  it("renders a working demo with zero arguments: 8 image wrappers plus a centered headline", () => {
    const { host } = render(parallaxHeroImages() as DomphyElement);
    const section = host.firstElementChild as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.getAttribute("data-tone")).toBe("shift-1");
    expect(section.querySelectorAll("img")).toHaveLength(8);
    expect(section.textContent).toContain("Built for teams who ship fast.");
  });

  it("tracks pointermove into per-image transforms without throwing, and settles on pointerleave", () => {
    const { host } = render(parallaxHeroImages({ variant: "edge-focus" }) as DomphyElement);
    const section = host.firstElementChild as HTMLElement;

    Object.defineProperty(section, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400 }),
    });

    expect(() => {
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 700, clientY: 50, bubbles: true }) as PointerEvent);
      section.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }));
    }).not.toThrow();
  });

  it("accepts a custom image list and offset/smoothing tuning without throwing", () => {
    expect(() =>
      render(
        parallaxHeroImages({
          images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
          maxOffset: 60,
          smoothing: 0.3,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
