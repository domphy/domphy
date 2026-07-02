// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { stripedPattern } from "../../../src/magicui/backgrounds/stripedPattern.ts";

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

describe("stripedPattern", () => {
  it("renders a working demo tree with zero args: a full-bleed diagonal-stripe tile svg", () => {
    const { host } = render(stripedPattern() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();

    const svg = wrapper.querySelector("svg") as SVGSVGElement;
    expect(svg).toBeTruthy();
    const pattern = svg.querySelector("pattern");
    expect(pattern).toBeTruthy();
    // Three-line-per-tile technique for seamless diagonal tiling.
    expect(pattern?.querySelectorAll("line").length).toBe(3);
    expect(svg.querySelector("rect")).toBeTruthy();
  });

  it("mirrors line endpoints when direction is 'left'", () => {
    const { host: rightHost } = render(stripedPattern({ direction: "right", width: 10, height: 10 }) as DomphyElement);
    const rightLine = rightHost.querySelector("pattern line") as SVGLineElement;
    const { host: leftHost } = render(stripedPattern({ direction: "left", width: 10, height: 10 }) as DomphyElement);
    const leftLine = leftHost.querySelector("pattern line") as SVGLineElement;
    expect(leftLine.getAttribute("x1")).not.toBe(rightLine.getAttribute("x1"));
  });

  it("accepts custom content via children", () => {
    const { host } = render(stripedPattern({ children: { span: "Custom overlay" } }) as DomphyElement);
    expect(host.textContent).toContain("Custom overlay");
  });
});
