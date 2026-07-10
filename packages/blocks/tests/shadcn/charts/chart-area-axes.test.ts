// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaAxes } from "../../../src/shadcn/charts/chart-area-axes.ts";

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

describe("chartAreaAxes", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, and trend footer", () => {
    const { host } = render(chartAreaAxes() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart - Axes");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts a custom y-axis tick count without throwing", () => {
    const { host } = render(
      chartAreaAxes({ yAxisTickCount: 5 }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
