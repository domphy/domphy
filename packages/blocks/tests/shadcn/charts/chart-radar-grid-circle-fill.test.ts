// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarGridCircleFill } from "../../../src/shadcn/charts/chart-radar-grid-circle-fill.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarGridCircleFill", () => {
  it("renders a tinted circular grid and keeps the standard labeled tooltip content", () => {
    const { host } = render(chartRadarGridCircleFill() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Grid Circle Filled");
    // Four circular grid rings + one tinted fill circle layer (no dots requested).
    expect(host.querySelectorAll("svg circle").length).toBe(5);
    expect(host.querySelectorAll("svg polygon").length).toBe(1);
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(1);
  });
});
