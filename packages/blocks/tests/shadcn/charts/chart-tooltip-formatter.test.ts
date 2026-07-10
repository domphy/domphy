// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartTooltipFormatter } from "../../../src/shadcn/charts/chart-tooltip-formatter.ts";

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

describe("chartTooltipFormatter", () => {
  it("renders a working demo tree with zero args: card shell + chart canvas", () => {
    const { host } = render(chartTooltipFormatter() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Bar Chart - Tooltip Formatter",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });

  it("accepts a custom unit and minimum row width without throwing", () => {
    const { host } = render(
      chartTooltipFormatter({
        unit: "min",
        minRowWidthPx: 72,
      }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
