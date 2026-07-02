// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarLabelCustom } from "../../../src/shadcn/charts/chart-radar-label-custom.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarLabelCustom", () => {
  it("renders a two-line value/month label at each of the six spokes", () => {
    const { host } = render(chartRadarLabelCustom() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Custom Label");
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(2);
    // Two <text> lines per category (value/value, then month name) x six categories.
    expect(host.querySelectorAll("svg text").length).toBe(12);
    // The bold "value/value" line is built from two <tspan> sub-spans per category.
    expect(host.querySelectorAll("svg tspan").length).toBe(12);
    expect(host.textContent).toContain("January");
  });
});
