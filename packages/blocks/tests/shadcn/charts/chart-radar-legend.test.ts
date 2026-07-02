// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarLegend } from "../../../src/shadcn/charts/chart-radar-legend.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarLegend", () => {
  it("renders the multi-series chart with a swatch+label legend row beneath it", () => {
    const { host } = render(chartRadarLegend() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Legend");
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(2);
    expect(host.textContent).toContain("Desktop");
    expect(host.textContent).toContain("Mobile");
  });

  it("can omit the legend row via showLegend: false without breaking the chart", () => {
    const { host } = render(chartRadarLegend({ showLegend: false }) as DomphyElement);
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(2);
  });
});
