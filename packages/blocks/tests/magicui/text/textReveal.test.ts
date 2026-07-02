// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { textReveal } from "../../../src/magicui/text/textReveal.ts";

// jsdom may lack requestAnimationFrame depending on config — textReveal()'s
// own guard bails out of the scroll-scrub loop on mount in that case, so
// this only exercises structure (sticky wrapper + two overlapping
// paragraphs), not live scroll-progress math.

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

describe("textReveal", () => {
  it("renders a working demo with zero args: a muted background paragraph plus a per-word foreground paragraph", () => {
    const { host, node } = render(textReveal() as DomphyElement);
    flushSync();

    const paragraphs = host.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);

    const backgroundParagraph = paragraphs[0];
    expect(backgroundParagraph.getAttribute("aria-hidden")).toBe("true");

    const foregroundParagraph = paragraphs[1];
    const wordSpans = foregroundParagraph.querySelectorAll(":scope > span");
    expect(wordSpans.length).toBeGreaterThan(1);
    expect(foregroundParagraph.textContent).toContain("Domphy");

    expect(node.generateCSS()).toContain("200vh");
  });

  it("accepts custom text and wrapper height without throwing", () => {
    expect(() =>
      render(textReveal({ children: "Short scroll demo text here", wrapperHeightVh: 150 }) as DomphyElement),
    ).not.toThrow();
  });

  it("removes cleanly without throwing (no scroll/resize listener leak)", () => {
    const { node } = render(textReveal() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
