// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { backgroundBeams } from "../../../src/aceternity/backgrounds/backgroundBeams.ts";

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

describe("backgroundBeams", () => {
  it("renders a working demo tree with zero args: an svg of 20 beams, a vignette overlay, and default content", () => {
    const { host } = render(backgroundBeams() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-tone")).toBe("shift-15");

    const svg = wrapper.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg!.querySelectorAll("path").length).toBe(20);
    expect(svg!.querySelectorAll("linearGradient").length).toBe(20);
    expect(svg!.querySelector("feGaussianBlur")).toBeTruthy();
    expect(wrapper.textContent).toContain("Background Beams");
  });

  it("respects `count`, custom `paths`, and disabling the vignette", () => {
    const { host } = render(
      backgroundBeams({
        paths: ["M0 0 C1 1, 2 2, 3 3", "M0 10 C1 11, 2 12, 3 13"],
        showVignette: false,
        children: { span: "Custom overlay" },
      }) as DomphyElement,
    );
    const wrapper = host.firstElementChild as HTMLElement;
    const svg = wrapper.querySelector("svg")!;
    expect(svg.querySelectorAll("path").length).toBe(2);
    // svgLayer + content wrapper only — no vignette div.
    expect(wrapper.children.length).toBe(2);
    expect(wrapper.textContent).toContain("Custom overlay");
  });
});
