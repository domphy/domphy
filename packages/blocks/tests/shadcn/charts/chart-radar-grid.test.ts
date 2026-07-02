// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarGrid } from "../../../src/shadcn/charts/chart-radar-grid.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarGrid", () => {
  it("renders a circular ring grid with spokes suppressed, dotted data polygon, no tooltip label", () => {
    const { host } = render(chartRadarGrid() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Grid");
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(1);
    // Four circular grid rings + six vertex dots, no radial spoke <line>s.
    expect(host.querySelectorAll("svg circle").length).toBe(10);
    expect(host.querySelectorAll("svg line").length).toBe(0);
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });
});
