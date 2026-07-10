// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartLineLabelCustom } from "../../../src/shadcn/charts/chart-line-label-custom.ts";

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

describe("chartLineLabelCustom", () => {
  it("renders a working demo tree with zero args: titled card, categorical chart plot, colored-dot overlay, trend footer", () => {
    const { host } = render(chartLineLabelCustom() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Line Chart - Custom Label",
    );
    expect(host.querySelector("footer")).toBeTruthy();
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });
});
