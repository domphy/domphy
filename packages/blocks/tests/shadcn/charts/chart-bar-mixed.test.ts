// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarMixed } from "../../../src/shadcn/charts/chart-bar-mixed.ts";

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

describe("chartBarMixed", () => {
  it("renders a working demo tree with zero args: card shell, individually colored bars, trend footer", () => {
    const { host } = render(chartBarMixed() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Bar Chart - Mixed");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });
});
