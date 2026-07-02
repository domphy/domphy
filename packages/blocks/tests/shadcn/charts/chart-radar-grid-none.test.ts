// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarGridNone } from "../../../src/shadcn/charts/chart-radar-grid-none.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarGridNone", () => {
  it("renders only the month labels and the dotted data polygon, no background grid at all", () => {
    const { host } = render(chartRadarGridNone() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Grid None");
    expect(host.querySelectorAll("svg polygon").length).toBe(1);
    expect(host.querySelectorAll("svg circle").length).toBe(6);
    expect(host.querySelectorAll("svg line").length).toBe(0);
    expect(host.querySelectorAll("svg text").length).toBe(6);
  });
});
