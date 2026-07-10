// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartTooltipLabelFormatter } from "../../../src/shadcn/charts/chart-tooltip-label-formatter.ts";

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

describe("chartTooltipLabelFormatter", () => {
  it("renders a working demo tree with zero args: card shell + chart canvas", () => {
    const { host } = render(chartTooltipLabelFormatter() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Bar Chart - Tooltip Label Formatter",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });

  it("accepts custom label/axis formatters without throwing", () => {
    const { host } = render(
      chartTooltipLabelFormatter({
        labelFormatter: (isoDate) => `On ${isoDate}`,
        xAxisLabelFormatter: (isoDate) => isoDate.slice(8),
      }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
