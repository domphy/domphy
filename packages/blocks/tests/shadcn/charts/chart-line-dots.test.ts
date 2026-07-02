// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartLineDots } from "../../../src/shadcn/charts/chart-line-dots.ts";

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

describe("chartLineDots", () => {
  it("renders a working demo tree with zero args: titled card, chart plot, hover-dot overlay, trend footer", () => {
    const { host } = render(chartLineDots() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Line Chart - Dots");
    expect(host.querySelector("footer")).toBeTruthy();
    expect(host.querySelector("canvas")).toBeTruthy();
    // The hover-dot overlay mounts its own <svg><circle> pair.
    expect(host.querySelector("svg circle")).toBeTruthy();
  });
});
