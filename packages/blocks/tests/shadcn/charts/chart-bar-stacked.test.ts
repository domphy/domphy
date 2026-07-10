// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarStacked } from "../../../src/shadcn/charts/chart-bar-stacked.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartBarStacked", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, legend row, trend footer", () => {
    const { host } = render(chartBarStacked() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Bar Chart - Stacked + Legend",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelectorAll("small").length).toBeGreaterThanOrEqual(2);
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("hides the legend row when showLegend is false", () => {
    const { host } = render(
      chartBarStacked({ showLegend: false }) as DomphyElement,
    );
    // Only the footer caption <small> should remain — no legend swatch labels.
    expect(host.querySelectorAll("small").length).toBe(1);
  });
});
