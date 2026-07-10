// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartTooltipIndicatorNone } from "../../../src/shadcn/charts/chart-tooltip-indicator-none.ts";

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

describe("chartTooltipIndicatorNone", () => {
  it("renders a working demo tree with zero args: card shell + chart canvas", () => {
    const { host } = render(chartTooltipIndicatorNone() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Bar Chart - Tooltip Indicator None",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });

  it("accepts a null default-open index without throwing", () => {
    const { host } = render(
      chartTooltipIndicatorNone({ defaultOpenIndex: null }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
