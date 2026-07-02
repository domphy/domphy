// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadialGrid } from "../../../src/shadcn/charts/chart-radial-grid.ts";

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

describe("chartRadialGrid", () => {
  it("renders a working demo tree with zero args: card, five ring arcs, and polar gridlines (no background tracks)", () => {
    const { host } = render(chartRadialGrid() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Radial Chart - Grid");
    expect(host.querySelectorAll("svg path")).toHaveLength(5);
    // 4 gridline circles, no per-ring background track circles.
    expect(host.querySelectorAll("svg circle")).toHaveLength(4);
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts a custom grid circle count", () => {
    const { host } = render(chartRadialGrid({ gridCircleCount: 6 }) as DomphyElement);
    expect(host.querySelectorAll("svg circle")).toHaveLength(6);
  });
});
