// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartLineDefault } from "../../../src/shadcn/charts/chart-line-default.ts";

// @domphy/chart's chart() patch uses ResizeObserver, which jsdom doesn't implement.
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

describe("chartLineDefault", () => {
  it("renders a working demo tree with zero args: titled card, chart plot, trend footer", () => {
    const { host } = render(chartLineDefault() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Line Chart");
    expect(host.querySelector("p")?.textContent).toContain("2026");
    expect(host.querySelector("footer")).toBeTruthy();
    expect(host.querySelector("footer span")?.textContent).toContain(
      "Trending up",
    );
    // chart() appends a <canvas> + two <svg> overlays synchronously on mount.
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });

  it("accepts custom title/description/trend text props", () => {
    const { host } = render(
      chartLineDefault({
        title: "Custom Title",
        description: "Custom description",
        trendHeadline: "Trending down by 3%",
        trendDirection: "down",
      }) as DomphyElement,
    );
    expect(host.querySelector("h3")?.textContent).toBe("Custom Title");
    expect(host.querySelector("p")?.textContent).toBe("Custom description");
    expect(host.querySelector("footer span")?.textContent).toBe(
      "Trending down by 3%",
    );
  });
});
