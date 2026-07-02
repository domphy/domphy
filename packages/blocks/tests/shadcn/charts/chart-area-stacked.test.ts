// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaStacked } from "../../../src/shadcn/charts/chart-area-stacked.ts";

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

describe("chartAreaStacked", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, and trend footer", () => {
    const { host } = render(chartAreaStacked() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart - Stacked");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts a custom stack id and fill opacity without throwing", () => {
    const { host } = render(
      chartAreaStacked({ stackId: "custom", fillOpacity: 0.6 }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
