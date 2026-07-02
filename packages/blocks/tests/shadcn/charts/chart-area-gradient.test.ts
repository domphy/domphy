// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaGradient } from "../../../src/shadcn/charts/chart-area-gradient.ts";

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

describe("chartAreaGradient", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, and trend footer", () => {
    const { host } = render(chartAreaGradient() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart - Gradient");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts custom two-series data and title", () => {
    const { host } = render(
      chartAreaGradient({
        title: "Traffic",
        data: [
          { month: "Jul", desktop: 100, mobile: 50 },
          { month: "Aug", desktop: 120, mobile: 60 },
        ],
      }) as DomphyElement,
    );
    expect(host.querySelector("h3")?.textContent).toBe("Traffic");
  });
});
