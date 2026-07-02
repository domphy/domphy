// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadialShape } from "../../../src/shadcn/charts/chart-radial-shape.ts";

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

describe("chartRadialShape", () => {
  it("renders a working demo tree with zero args: card, one gauge arc, decorative circles, and a centered value", () => {
    const { host } = render(chartRadialShape() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Radial Chart - Shape");
    expect(host.querySelectorAll("svg path")).toHaveLength(1);
    // 2 decorative framing circles + 1 background track circle.
    expect(host.querySelectorAll("svg circle")).toHaveLength(3);
    expect(host.querySelector("h2")?.textContent).toBe("1,125");
    expect(host.querySelectorAll("small")[0]?.textContent).toBe("Visitors");
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts a custom value/caption", () => {
    const { host } = render(chartRadialShape({ value: 42, captionText: "Signups" }) as DomphyElement);
    expect(host.querySelector("h2")?.textContent).toBe("42");
    expect(host.querySelectorAll("small")[0]?.textContent).toBe("Signups");
  });
});
