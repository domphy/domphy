// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarGridCircle } from "../../../src/shadcn/charts/chart-radar-grid-circle.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarGridCircle", () => {
  it("renders circular grid rings with the radial spokes kept, plus corner dots", () => {
    const { host } = render(chartRadarGridCircle() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe(
      "Radar Chart - Grid Circle",
    );
    expect(host.querySelectorAll("svg polygon").length).toBe(1);
    // Four circular grid rings + six vertex dots.
    expect(host.querySelectorAll("svg circle").length).toBe(10);
    expect(host.querySelectorAll("svg line").length).toBe(6);
  });
});
