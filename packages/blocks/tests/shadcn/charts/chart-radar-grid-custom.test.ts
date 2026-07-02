// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarGridCustom } from "../../../src/shadcn/charts/chart-radar-grid-custom.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarGridCustom", () => {
  it("renders exactly one thin custom ring and no radial spokes", () => {
    const { host } = render(chartRadarGridCustom() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Grid Custom");
    // One custom ring + one data-series outline.
    expect(host.querySelectorAll("svg polygon").length).toBe(2);
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(1);
    expect(host.querySelectorAll("svg line").length).toBe(0);
  });
});
