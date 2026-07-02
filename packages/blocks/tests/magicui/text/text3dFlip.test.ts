// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { text3dFlip } from "../../../src/magicui/text/text3dFlip.ts";

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

describe("text3dFlip", () => {
  it("renders a working demo: one h2 with a front/back flip cell per character", () => {
    const { host, node } = render(text3dFlip() as DomphyElement);
    flushSync();

    const heading = host.querySelector("h2");
    expect(heading).toBeTruthy();

    const frontFaces = Array.from(host.querySelectorAll('[data-face="front"]'));
    const backFaces = host.querySelectorAll('[data-face="back"]');
    expect(frontFaces.length).toBeGreaterThan(0);
    expect(frontFaces.length).toBe(backFaces.length);
    // Front faces alone (back faces are aria-hidden duplicates used for the
    // hover reveal) reconstruct the default demo phrase, one cell per
    // character (spaces render as a non-breaking space to keep their width).
    const frontText = frontFaces.map((face) => face.textContent).join("").replace(/ /g, " ");
    expect(frontText).toBe("Fortune favors the bold");
    expect(backFaces[0]?.getAttribute("aria-hidden")).toBe("true");

    // The hover-driven flip lives entirely in CSS on the outer wrapper.
    expect(node.generateCSS()).toContain(":hover");
  });

  it("accepts custom text, a flipped phrase, an edge, and a stagger origin without throwing", () => {
    expect(() =>
      render(
        text3dFlip({
          children: "Hi",
          flippedChildren: "Yo",
          edge: "left",
          staggerFrom: "center",
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
