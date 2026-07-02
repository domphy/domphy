// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { animatedBeam } from "../../../src/magicui/effects/animatedBeam.ts";

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

describe("animatedBeam", () => {
  it("renders a working demo with zero args: 3 badge nodes and an svg overlay with 2 connections", () => {
    const { host } = render(animatedBeam() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    // 3 default nodes (source-a, source-b, hub).
    expect(container.querySelectorAll(":scope > div")).toHaveLength(3);
    // The beam overlay svg is a direct child of the container (node badges
    // also contain their own small icon svg, so this must not match those).
    const svg = container.querySelector(":scope > svg");
    expect(svg).toBeTruthy();
    // 2 default connections -> 2 static paths + 2 glow paths.
    expect(svg!.querySelectorAll("path")).toHaveLength(4);
    expect(svg!.querySelectorAll("linearGradient")).toHaveLength(2);
  });

  it("accepts custom nodes/connections and renders one node per spec", () => {
    const { host } = render(
      animatedBeam({
        nodes: [
          { id: "a", top: "10%", left: "10%" },
          { id: "b", top: "90%", left: "90%" },
        ],
        connections: [{ from: "a", to: "b", duration: 1000 }],
      }) as DomphyElement,
    );
    const container = host.firstElementChild as HTMLElement;
    expect(container.querySelectorAll(":scope > div")).toHaveLength(2);
    expect(container.querySelectorAll("svg path")).toHaveLength(2);
  });

  it("removes cleanly without throwing (no rAF/ResizeObserver in jsdom)", () => {
    const { node } = render(animatedBeam() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
