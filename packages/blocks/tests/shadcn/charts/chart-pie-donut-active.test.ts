// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieDonutActive } from "../../../src/shadcn/charts/chart-pie-donut-active.js";
import {
  DEFAULT_DONUT_INNER_RADIUS,
  DEFAULT_PAD_ANGLE,
  DEFAULT_PIE_DATA,
  PIE_OUTER_RADIUS,
  arcSlicePath,
  layoutPieSlices,
} from "../../../src/shadcn/charts/pie-chart-shared.js";

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
  it("draws exactly one wedge enlarged with a bigger outer radius, all sharing the same stroke width", () => {
    const { host } = render(chartPieDonutActive());

    const wedges = Array.from(host.querySelectorAll("svg path"));
    expect(wedges.length).toBe(5);

    // Upstream applies a single strokeWidth={5} to the whole <Pie>; the active
    // sector only grows outward, it never gets a distinct outline weight.
    const strokeWidths = new Set(wedges.map((wedge) => wedge.getAttribute("stroke-width")));
    expect(strokeWidths.size).toBe(1);

    const slices = layoutPieSlices(DEFAULT_PIE_DATA);
    const baseD = slices.map((slice) =>
      arcSlicePath(slice, DEFAULT_DONUT_INNER_RADIUS, PIE_OUTER_RADIUS, DEFAULT_PAD_ANGLE),
    );
    const enlargedD = slices.map((slice) =>
      arcSlicePath(slice, DEFAULT_DONUT_INNER_RADIUS, PIE_OUTER_RADIUS + 10, DEFAULT_PAD_ANGLE),
    );

    const actualD = wedges.map((wedge) => wedge.getAttribute("d"));
    // Defaults to the first record's key being active.
    expect(actualD[0]).toBe(enlargedD[0]);
    for (let index = 1; index < actualD.length; index += 1) {
      expect(actualD[index]).toBe(baseD[index]);
    }
  });

  it("enlarges the requested activeKey instead of the first record by default", () => {
    const data = [
      { key: "a", name: "Alpha", value: 10 },
      { key: "b", name: "Beta", value: 20 },
    ];
    const { host } = render(chartPieDonutActive({ data, activeKey: "b" }));

    const wedges = Array.from(host.querySelectorAll("svg path"));
    expect(wedges.length).toBe(2);

    const slices = layoutPieSlices(data);
    const baseD = slices.map((slice) =>
      arcSlicePath(slice, DEFAULT_DONUT_INNER_RADIUS, PIE_OUTER_RADIUS, DEFAULT_PAD_ANGLE),
    );
    const enlargedD = slices.map((slice) =>
      arcSlicePath(slice, DEFAULT_DONUT_INNER_RADIUS, PIE_OUTER_RADIUS + 10, DEFAULT_PAD_ANGLE),
    );

    const actualD = wedges.map((wedge) => wedge.getAttribute("d"));
    expect(actualD[0]).toBe(baseD[0]);
    expect(actualD[1]).toBe(enlargedD[1]);
  });
});
