// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieLabelCustom } from "../../../src/shadcn/charts/chart-pie-label-custom.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieLabelCustom", () => {
  it("renders one bold numeric label per wedge, positioned by trigonometry", () => {
    const { host } = render(chartPieLabelCustom());

    const wedges = host.querySelectorAll("svg path");
    const labels = host.querySelectorAll("svg text");
    expect(wedges.length).toBe(5);
    expect(labels.length).toBe(5);
    expect(labels[0].textContent).toBe("275");
    expect(labels[0].getAttribute("text-anchor")).toBe("middle");
  });
});
