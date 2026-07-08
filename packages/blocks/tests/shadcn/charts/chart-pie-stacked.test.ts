// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieStacked } from "../../../src/shadcn/charts/chart-pie-stacked.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieStacked", () => {
  it("renders two concentric rings (10 wedges for the 5-month default dataset)", () => {
    const { host } = render(chartPieStacked());

    expect(host.querySelectorAll("svg path").length).toBe(10);
  });

  it("labels the hovered wedge's ring in the tooltip", () => {
    const { host } = render(chartPieStacked());
    const wedges = host.querySelectorAll("svg path");

    wedges[0].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, clientX: 5, clientY: 5 }));
    flushSync();
    expect(host.textContent).toContain("Desktop");
  });
});
