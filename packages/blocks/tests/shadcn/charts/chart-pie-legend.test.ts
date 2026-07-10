// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieLegend } from "../../../src/shadcn/charts/chart-pie-legend.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieLegend", () => {
  it("renders a wrapped swatch+name legend beneath the chart and no footer", () => {
    const { host } = render(chartPieLegend());

    expect(host.querySelectorAll("svg path").length).toBe(5);
    expect(host.querySelectorAll("footer").length).toBe(0);
    expect(host.textContent).toContain("Safari");
    // One legend-row swatch per category, plus the (always-mounted, hidden
    // until hover) shared tooltip swatch — both reuse the 10x10 chip markup.
    expect(host.querySelectorAll("svg[viewBox='0 0 10 10']").length).toBe(6);
  });

  it("honors a custom legend column count without throwing", () => {
    const { host } = render(
      chartPieLegend({
        legendColumns: 2,
        data: [
          { key: "a", name: "Alpha", value: 1 },
          { key: "b", name: "Beta", value: 2 },
        ],
      }),
    );

    expect(host.textContent).toContain("Alpha");
    expect(host.textContent).toContain("Beta");
  });
});
