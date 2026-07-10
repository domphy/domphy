// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaStackedExpand } from "../../../src/shadcn/charts/chart-area-stacked-expand.ts";

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

describe("chartAreaStackedExpand", () => {
  it("renders a working demo tree with zero args: three-series card shell and chart frame", () => {
    const { host } = render(chartAreaStackedExpand() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Area Chart - Stacked Expand",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts custom three-series data without throwing", () => {
    const { host } = render(
      chartAreaStackedExpand({
        data: [
          { month: "Jul", desktop: 50, mobile: 30, other: 5 },
          { month: "Aug", desktop: 55, mobile: 35, other: 10 },
        ],
      }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
