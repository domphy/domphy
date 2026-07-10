// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { hexagonPattern } from "../../../src/magicui/backgrounds/hexagonPattern.ts";

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

describe("hexagonPattern", () => {
  it("renders a working demo tree with zero args: a full-bleed hex tile svg plus highlighted cells", () => {
    const { host } = render(hexagonPattern() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();

    const svg = wrapper.querySelector("svg") as SVGSVGElement;
    expect(svg).toBeTruthy();
    expect(svg.querySelector("pattern")).toBeTruthy();
    expect(svg.querySelector("pattern polygon")).toBeTruthy();
    expect(svg.querySelector("rect")).toBeTruthy();
    // Three default highlighted cells rendered as extra polygons above the tile.
    expect(svg.querySelectorAll(":scope > polygon").length).toBe(3);
  });

  it("switches to dashed per-edge line segments when strokeDasharray is set", () => {
    const { host } = render(
      hexagonPattern({ strokeDasharray: "4 2", hexagons: [] }) as DomphyElement,
    );
    const svg = host.querySelector("svg") as SVGSVGElement;
    expect(svg.querySelector("pattern polygon")).toBeNull();
    expect(svg.querySelector("pattern line")).toBeTruthy();
  });

  it("accepts custom content via children", () => {
    const { host } = render(
      hexagonPattern({ children: { span: "Custom overlay" } }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom overlay");
  });
});
