// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarActive } from "../../../src/shadcn/charts/chart-bar-active.ts";

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

describe("chartBarActive", () => {
  it("renders a working demo tree with zero args: card shell, chart frame with active-bar overlay, trend footer", () => {
    const { host } = render(chartBarActive() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Bar Chart - Active");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("clamps an out-of-range activeIndex without throwing", () => {
    const { host } = render(chartBarActive({ activeIndex: 99 }) as DomphyElement);
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
