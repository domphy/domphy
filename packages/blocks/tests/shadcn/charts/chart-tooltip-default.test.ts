// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartTooltipDefault } from "../../../src/shadcn/charts/chart-tooltip-default.ts";

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

describe("chartTooltipDefault", () => {
  it("renders a working demo tree with zero args: card shell + chart canvas", () => {
    const { host } = render(chartTooltipDefault() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Bar Chart - Tooltip");
    expect(host.querySelector("canvas")).toBeTruthy();
  });

  it("accepts custom data/series and a disabled pin index without throwing", () => {
    const { host } = render(
      chartTooltipDefault({
        showCursor: true,
        defaultOpenIndex: null,
        title: "Custom Title",
      }) as DomphyElement,
    );
    expect(host.querySelector("h3")?.textContent).toBe("Custom Title");
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
