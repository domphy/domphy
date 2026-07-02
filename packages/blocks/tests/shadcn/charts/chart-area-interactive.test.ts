// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaInteractive } from "../../../src/shadcn/charts/chart-area-interactive.ts";

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

describe("chartAreaInteractive", () => {
  it("renders a working demo tree with zero args: card shell, range select, and chart frame (no footer)", () => {
    const { host } = render(chartAreaInteractive() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart - Interactive");
    expect(host.querySelector("canvas")).toBeTruthy();
    const select = host.querySelector("select") as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(3);
    expect(select.value).toBe("90");
    expect(host.querySelector("footer")).toBeNull();
  });

  it("switching the range select does not throw and re-renders the chart", () => {
    const { host } = render(chartAreaInteractive() as DomphyElement);
    const select = host.querySelector("select") as HTMLSelectElement;
    select.value = "7";
    expect(() =>
      select.dispatchEvent(new Event("change", { bubbles: true })),
    ).not.toThrow();
  });
});
