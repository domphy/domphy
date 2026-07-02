// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarRadius } from "../../../src/shadcn/charts/chart-radar-radius.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarRadius", () => {
  it("renders the multi-series chart with one extra radius-axis reference line", () => {
    const { host } = render(chartRadarRadius() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Radius Axis");
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(2);
    // Six radial spokes (the default grid) plus the one added radius-axis line.
    expect(host.querySelectorAll("svg line").length).toBe(7);
  });

  it("can hide the radius-axis line via showRadiusAxisLine: false", () => {
    const { host } = render(chartRadarRadius({ showRadiusAxisLine: false }) as DomphyElement);
    expect(host.querySelectorAll("svg line").length).toBe(6);
  });
});
