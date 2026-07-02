// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarHorizontal } from "../../../src/shadcn/charts/chart-bar-horizontal.ts";

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

describe("chartBarHorizontal", () => {
  it("renders a working demo tree with zero args: card shell, chart frame with hover overlay, and trend footer", () => {
    const { host } = render(chartBarHorizontal() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Bar Chart - Horizontal");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts a custom grid and truncation length without throwing", () => {
    const { host } = render(
      chartBarHorizontal({ categoryTruncateLength: 3, grid: { left: 32, right: 8, top: 4, bottom: 4 } }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
