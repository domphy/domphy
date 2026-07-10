// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartLineDotsCustom } from "../../../src/shadcn/charts/chart-line-dots-custom.ts";

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

describe("chartLineDotsCustom", () => {
  it("renders a working demo tree with zero args: titled card, chart plot, custom-marker overlay, trend footer", () => {
    const { host } = render(chartLineDotsCustom() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Line Chart - Custom Dots",
    );
    expect(host.querySelector("footer")).toBeTruthy();
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });
});
