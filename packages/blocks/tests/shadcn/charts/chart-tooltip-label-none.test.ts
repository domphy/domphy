// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartTooltipLabelNone } from "../../../src/shadcn/charts/chart-tooltip-label-none.ts";

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

describe("chartTooltipLabelNone", () => {
  it("renders a working demo tree with zero args: card shell + chart canvas", () => {
    const { host } = render(chartTooltipLabelNone() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Bar Chart - Tooltip Label None",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });

  it("accepts custom data without throwing", () => {
    const { host } = render(
      chartTooltipLabelNone({ showCursor: true }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
