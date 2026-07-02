// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { animatedGradientText } from "../../../src/magicui/text/animatedGradientText.js";

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

describe("animatedGradientText", () => {
  it("renders a working demo with zero arguments: pill-wrapped flowing gradient text", () => {
    const { host } = render(animatedGradientText() as DomphyElement);

    expect(host.textContent).toContain("Animated Gradient Text");
    // Pill wrapper (default showPill: true) is the single top-level element.
    expect(host.children.length).toBe(1);
    expect(host.querySelector("span")?.textContent).toBe(
      "Animated Gradient Text",
    );
  });

  it("renders just the gradient span when showPill is false", () => {
    const { host } = render(
      animatedGradientText({ showPill: false }) as DomphyElement,
    );
    const span = host.firstElementChild as HTMLElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.textContent).toBe("Animated Gradient Text");
  });

  it("accepts custom text content and a speed multiplier without throwing", () => {
    expect(() =>
      render(
        animatedGradientText({
          children: "Ship faster",
          speed: 2,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
