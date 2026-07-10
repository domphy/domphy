// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieDonut } from "../../../src/shadcn/charts/chart-pie-donut.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieDonut", () => {
  it("renders a ring of wedges (paths reference an inner+outer arc)", () => {
    const { host } = render(chartPieDonut());

    const wedges = host.querySelectorAll("svg path");
    expect(wedges.length).toBe(5);
    // A donut wedge's path draws two arcs (inner + outer) — a full pie wedge
    // draws only one — so counting "A " occurrences distinguishes them.
    const arcCount =
      (wedges[0].getAttribute("d") ?? "").split(" A ").length - 1;
    expect(arcCount).toBe(2);
  });
});
