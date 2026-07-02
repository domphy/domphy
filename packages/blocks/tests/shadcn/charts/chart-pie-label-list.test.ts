// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieLabelList } from "../../../src/shadcn/charts/chart-pie-label-list.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieLabelList", () => {
  it("renders a compact display-name label per wedge sourced from the lookup table", () => {
    const { host } = render(chartPieLabelList());
    // Scope to the chart's own 200x200-viewBox SVG — the card footer's trend
    // icon is also an <svg><polyline> pair and would otherwise leak in.
    const svg = host.querySelector('svg[viewBox="0 0 200 200"]')!;

    expect(svg.querySelectorAll("path").length).toBe(5);
    expect(svg.querySelectorAll("text").length).toBe(5);
    expect(svg.querySelectorAll("polyline").length).toBe(0);
    expect(host.textContent).toContain("Firefox");
  });

  it("falls back to the datum name when a key is missing from the lookup", () => {
    const { host } = render(
      chartPieLabelList({
        data: [{ key: "unknown-browser", name: "Mystery Browser", value: 42 }],
        displayNameLookup: {},
      }),
    );

    expect(host.textContent).toContain("Mystery Browser");
  });
});
