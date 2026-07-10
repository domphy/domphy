// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieSeparatorNone } from "../../../src/shadcn/charts/chart-pie-separator-none.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieSeparatorNone", () => {
  it("renders wedges with zero stroke and no stroke attribute at all", () => {
    const { host } = render(chartPieSeparatorNone());

    const wedges = Array.from(host.querySelectorAll("svg path"));
    expect(wedges.length).toBe(5);
    for (const wedge of wedges) {
      expect(wedge.getAttribute("stroke-width")).toBe("0");
      expect(wedge.hasAttribute("stroke")).toBe(false);
    }
  });

  it("lets a caller re-enable the separator via props", () => {
    const { host } = render(
      chartPieSeparatorNone({ strokeWidth: "2", padAngle: 0.02 }),
    );
    const wedge = host.querySelector("svg path")!;
    expect(wedge.getAttribute("stroke-width")).toBe("2");
    expect(wedge.hasAttribute("stroke")).toBe(true);
  });
});
