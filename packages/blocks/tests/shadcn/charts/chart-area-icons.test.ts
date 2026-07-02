// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaIcons } from "../../../src/shadcn/charts/chart-area-icons.ts";

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

describe("chartAreaIcons", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, icon legend row, and trend footer", () => {
    const { host } = render(chartAreaIcons() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart - Icons");
    expect(host.querySelector("canvas")).toBeTruthy();
    // Two legend icon glyphs + one footer trend glyph.
    expect(host.querySelectorAll("svg[aria-hidden='true']").length).toBeGreaterThanOrEqual(3);
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });
});
