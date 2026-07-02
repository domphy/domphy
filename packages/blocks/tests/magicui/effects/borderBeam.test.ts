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
  it("renders a working demo card with a comet-beam svg overlay", () => {
    const { host } = render(borderBeam() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Border Beam");
    const svg = host.querySelector("svg");
    expect(svg).toBeTruthy();
    // Core beam + blurred halo duplicate.
    expect(svg!.querySelectorAll("rect")).toHaveLength(2);
    const gradient = svg!.querySelector("linearGradient");
    expect(gradient).toBeTruthy();
    expect(gradient!.querySelectorAll("stop")).toHaveLength(2);
  });

  it("renders custom children content instead of the default demo body", () => {
    const { host } = render(
      borderBeam({ children: [{ p: "Custom body" } as DomphyElement] }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom body");
    expect(host.querySelector("h3")).toBeNull();
  });

  it("applies the configured stroke-dasharray fraction to both rects", () => {
    const { host } = render(borderBeam({ size: 35 }) as DomphyElement);
    const rects = host.querySelectorAll("rect");
    for (const rect of Array.from(rects)) {
      expect(rect.getAttribute("stroke-dasharray")).toBe("35 65");
    }
  });
});
