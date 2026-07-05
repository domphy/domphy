// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieLabel } from "../../../src/shadcn/charts/chart-pie-label.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

// The card footer's trend icon is also an <svg><polyline> pair — scope
// queries to the chart's own 200x200-viewBox SVG so footer decoration never
// leaks into these counts.
function chartSvg(host: HTMLElement): Element {
  return host.querySelector('svg[viewBox="0 0 200 200"]')!;
}

describe("chartPieLabel", () => {
  it("renders a working demo with wedges, leader lines and text labels", () => {
    const { host } = render(chartPieLabel());
    const svg = chartSvg(host);

    expect(svg.querySelectorAll("path").length).toBe(5);
    expect(svg.querySelectorAll("polyline").length).toBe(5);
    expect(svg.querySelectorAll("text").length).toBe(5);
    // Upstream's default pie label prints the numeric value (dataKey), not
    // the category name — the first wedge (Chrome) is labeled with "275".
    expect(svg.querySelectorAll("text")[0].textContent).toBe("275");
  });

  it("omits leader lines when leaderLine is false", () => {
    const { host } = render(chartPieLabel({ leaderLine: false }));
    const svg = chartSvg(host);

    expect(svg.querySelectorAll("polyline").length).toBe(0);
    expect(svg.querySelectorAll("text").length).toBe(5);
  });
});
