// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarNegative } from "../../../src/shadcn/charts/chart-bar-negative.ts";

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

describe("chartBarNegative", () => {
  it("renders a working demo tree with zero args: card shell, diverging chart, trend footer", () => {
    const { host } = render(chartBarNegative() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Bar Chart - Negative");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain("Trending down by 12.4%");
  });

  it("accepts custom positive/negative colors and mixed-sign data without throwing", () => {
    const { host } = render(
      chartBarNegative({
        data: [{ label: "A", value: 50 }, { label: "B", value: -30 }],
        positiveColor: "success",
        negativeColor: "warning",
      }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
