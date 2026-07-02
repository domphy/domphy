// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaDefault } from "../../../src/shadcn/charts/chart-area-default.ts";

// @domphy/chart's mount hook observes its container for resize — jsdom has no
// ResizeObserver implementation, so tests polyfill a no-op one (same pattern
// as packages/ui/tests/overlay.test.ts).
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

describe("chartAreaDefault", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, and trend footer", () => {
    const { host } = render(chartAreaDefault() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart");
    expect(host.querySelector("p")?.textContent).toContain("last 6 months");
    // Chart frame: the div carrying the @domphy/chart patch mounts a canvas
    // + two SVG overlay layers synchronously (WebGL device init is async).
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts custom data/title/trend props", () => {
    const { host } = render(
      chartAreaDefault({
        title: "Revenue",
        description: "Monthly recurring revenue",
        trendText: "Down 3.1% this quarter",
        trendDirection: "down",
      }) as DomphyElement,
    );
    expect(host.querySelector("h3")?.textContent).toBe("Revenue");
    expect(host.querySelector("footer")?.textContent).toContain("Down 3.1%");
  });
});
