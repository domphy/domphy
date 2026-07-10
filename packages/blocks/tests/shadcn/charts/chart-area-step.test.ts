// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartAreaStep } from "../../../src/shadcn/charts/chart-area-step.ts";

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

describe("chartAreaStep", () => {
  it("renders a working demo tree with zero args: card shell, chart frame, and trend footer", () => {
    const { host } = render(chartAreaStep() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Area Chart - Step");
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts a custom series icon override in the footer", () => {
    const { host } = render(
      chartAreaStep({ seriesIcon: "down" }) as DomphyElement,
    );
    expect(host.querySelector("footer svg")).toBeTruthy();
  });
});
