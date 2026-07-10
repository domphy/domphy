// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarLabel } from "../../../src/shadcn/charts/chart-bar-label.ts";

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

describe("chartBarLabel", () => {
  it("renders a working demo tree with zero args: card shell, labeled chart frame, trend footer", () => {
    const { host } = render(chartBarLabel() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Bar Chart - Label");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts a custom label formatter without throwing", () => {
    const { host } = render(
      chartBarLabel({
        labelFormatter: (value) => `${value}k`,
      }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
