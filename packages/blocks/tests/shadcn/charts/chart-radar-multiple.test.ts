// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarMultiple } from "../../../src/shadcn/charts/chart-radar-multiple.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarMultiple", () => {
  it("renders two overlapping data polygons over one shared grid", () => {
    const { host } = render(chartRadarMultiple() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe(
      "Radar Chart - Multiple",
    );
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(2);
    expect(host.querySelectorAll("svg text").length).toBe(6);
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });
});
