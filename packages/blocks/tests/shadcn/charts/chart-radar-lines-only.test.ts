// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarLinesOnly } from "../../../src/shadcn/charts/chart-radar-lines-only.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarLinesOnly", () => {
  it("renders two zero-fill stroke-only outlines with radial spokes suppressed", () => {
    const { host } = render(chartRadarLinesOnly() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Lines Only");
    // Four default grid rings + two data-series outlines, all <polygon> elements —
    // only the series outlines carry an explicit fill-opacity="0".
    const polygons = host.querySelectorAll("svg polygon");
    expect(polygons.length).toBe(6);
    const seriesOutlines = Array.from(polygons).filter((polygon) => polygon.hasAttribute("fill-opacity"));
    expect(seriesOutlines.length).toBe(2);
    for (const polygon of seriesOutlines) {
      expect(polygon.getAttribute("fill-opacity")).toBe("0");
    }
    // Grid rings remain (polygon shapes), but the center-to-label spokes (<line>) are gone.
    expect(host.querySelectorAll("svg line").length).toBe(0);
  });
});
