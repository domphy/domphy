// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarDefault } from "../../../src/shadcn/charts/chart-bar-default.ts";

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

describe("chartBarDefault", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, and trend footer", () => {
    const { host } = render(chartBarDefault() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Bar Chart");
    expect(host.querySelector("p")?.textContent).toBe("January - June 2026");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts custom data and colors without throwing", () => {
    const { host } = render(
      chartBarDefault({
        data: [{ label: "Q1", value: 40 }, { label: "Q2", value: 90 }],
        seriesColor: "success",
        cornerRadius: 4,
      }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });
});
