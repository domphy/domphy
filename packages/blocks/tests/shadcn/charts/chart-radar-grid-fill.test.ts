// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarGridFill } from "../../../src/shadcn/charts/chart-radar-grid-fill.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarGridFill", () => {
  it("renders a tinted grid backdrop and a reduced-opacity data polygon", () => {
    const { host } = render(chartRadarGridFill() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe(
      "Radar Chart - Grid Filled",
    );
    // Four polygon grid rings + one tinted fill layer + one data-series outline.
    expect(host.querySelectorAll("svg polygon").length).toBe(6);
    const opacities = Array.from(
      host.querySelectorAll("svg polygon[fill-opacity]"),
    ).map((polygon) => polygon.getAttribute("fill-opacity"));
    expect(opacities.sort()).toEqual(["0.2", "0.5"]);
  });
});
