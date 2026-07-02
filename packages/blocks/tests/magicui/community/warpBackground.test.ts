// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { warpBackground } from "../../../src/magicui/community/warpBackground.js";

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

describe("warpBackground", () => {
  it("renders a working demo with zero arguments (scene with 4 planes, default card content)", () => {
    const { host } = render(warpBackground());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBe("shift-15");
    const scene = container.firstElementChild!;
    // 4 planes (top/bottom/left/right), each with 3 default beams.
    expect(scene.children.length).toBe(4);
    for (const plane of Array.from(scene.children)) {
      expect(plane.querySelectorAll(":scope > span").length).toBe(3);
    }
    expect(container.textContent).toContain("Warp Background");
  });

  it("respects a custom beamsPerSide and custom children", () => {
    const { host } = render(
      warpBackground({ beamsPerSide: 2, children: { p: "Behind the tunnel" } }),
    );

    const container = host.firstElementChild!;
    const scene = container.firstElementChild!;
    for (const plane of Array.from(scene.children)) {
      expect(plane.querySelectorAll(":scope > span").length).toBe(2);
    }
    expect(container.textContent).toContain("Behind the tunnel");
  });
});
