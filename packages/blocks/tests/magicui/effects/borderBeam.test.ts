// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { borderBeam } from "../../../src/magicui/effects/borderBeam.ts";

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

describe("borderBeam", () => {
  it("renders a working demo card with a comet riding a masked border overlay", () => {
    const { host, node } = render(borderBeam() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Border Beam");
    // No SVG: upstream's technique is a CSS mask overlay plus an offset-path
    // comet div, not stroke-dasharray SVG rects.
    expect(host.querySelector("svg")).toBeNull();
    // Overlay (mask ring) + comet box, both decorative.
    expect(host.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    const css = node.generateCSS();
    // Mask intersects padding-box/border-box to reveal only the border ring.
    expect(css).toContain("mask-composite: intersect");
    // Comet rides a rounded-rect offset-path and fades head-to-transparent-tail.
    expect(css).toContain("offset-path: rect(0 auto auto 0 round 50px)");
    expect(css).toContain("linear-gradient(to left, var(--warning-9), var(--secondary-9), transparent)");
    expect(css).toMatch(/@keyframes border-beam-move-\d+/);
  });

  it("renders custom children content instead of the default demo body", () => {
    const { host } = render(
      borderBeam({ children: [{ p: "Custom body" } as DomphyElement] }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom body");
    expect(host.querySelector("h3")).toBeNull();
  });

  it("applies the configured size to the comet's dimensions and orbit corner radius", () => {
    const { node } = render(borderBeam({ size: 35 }) as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("width: 35px");
    expect(css).toContain("height: 35px");
    expect(css).toContain("offset-path: rect(0 auto auto 0 round 35px)");
  });
});
