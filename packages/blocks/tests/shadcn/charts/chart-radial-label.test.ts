// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadialLabel } from "../../../src/shadcn/charts/chart-radial-label.ts";

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

describe("chartRadialLabel", () => {
  it("renders a working demo tree with zero args: card, five ring arcs, and inline labels", () => {
    const { host } = render(chartRadialLabel() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Radial Chart - Label");
    expect(host.querySelectorAll("svg path")).toHaveLength(5);
    // Inline category labels render as always-visible <small> overlays.
    const labelTexts = Array.from(host.querySelectorAll("small")).map((el) => el.textContent);
    expect(labelTexts).toContain("Organic Search");
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("can hide inline labels via props", () => {
    const { host } = render(chartRadialLabel({ showInlineLabels: false }) as DomphyElement);
    const labelTexts = Array.from(host.querySelectorAll("small")).map((el) => el.textContent);
    expect(labelTexts).not.toContain("Organic Search");
  });
});
