// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartLineMultiple } from "../../../src/shadcn/charts/chart-line-multiple.ts";

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

describe("chartLineMultiple", () => {
  it("renders a working demo tree with zero args: titled card, two-series chart plot, trend footer", () => {
    const { host } = render(chartLineMultiple() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Line Chart - Multiple");
    expect(host.querySelector("footer")).toBeTruthy();
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
