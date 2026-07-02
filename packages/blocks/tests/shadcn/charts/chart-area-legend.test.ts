// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaLegend } from "../../../src/shadcn/charts/chart-area-legend.ts";

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

describe("chartAreaLegend", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, and a swatch legend row", () => {
    const { host } = render(chartAreaLegend() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart - Legend");
    expect(host.querySelector("canvas")).toBeTruthy();
    const legendText = Array.from(host.querySelectorAll("small")).map((el) => el.textContent);
    expect(legendText).toContain("Desktop");
    expect(legendText).toContain("Mobile");
  });
});
