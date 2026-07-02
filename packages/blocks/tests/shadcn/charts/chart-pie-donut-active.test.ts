// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieDonutActive } from "../../../src/shadcn/charts/chart-pie-donut-active.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieDonutActive", () => {
  it("draws exactly one wedge with a thicker stroke than the rest", () => {
    const { host } = render(chartPieDonutActive());

    const wedges = Array.from(host.querySelectorAll("svg path"));
    expect(wedges.length).toBe(5);
    const strokeWidths = wedges.map((wedge) => wedge.getAttribute("stroke-width"));
    expect(strokeWidths.filter((width) => width === "2.5").length).toBe(1);
    expect(strokeWidths.filter((width) => width === "1.5").length).toBe(4);
  });

  it("enlarges the requested activeKey instead of the first record by default", () => {
    const { host } = render(
      chartPieDonutActive({
        data: [
          { key: "a", name: "Alpha", value: 10 },
          { key: "b", name: "Beta", value: 20 },
        ],
        activeKey: "b",
      }),
    );

    const wedges = Array.from(host.querySelectorAll("svg path"));
    const activeIndex = wedges.findIndex((wedge) => wedge.getAttribute("stroke-width") === "2.5");
    expect(activeIndex).toBe(1);
  });
});
