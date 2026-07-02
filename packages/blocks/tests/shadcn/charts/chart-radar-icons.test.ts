// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarIcons } from "../../../src/shadcn/charts/chart-radar-icons.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarIcons", () => {
  it("renders the legend row with directional arrow icons instead of plain swatches", () => {
    const { host } = render(chartRadarIcons() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Icons");
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(2);
    // One trend-arrow icon in the footer, plus one per legend entry (two series).
    expect(host.querySelectorAll("svg[viewBox='0 0 24 24']").length).toBe(3);
  });
});
