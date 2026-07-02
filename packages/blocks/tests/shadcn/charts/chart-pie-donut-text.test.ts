// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieDonutText } from "../../../src/shadcn/charts/chart-pie-donut-text.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieDonutText", () => {
  it("renders the sum of all values as bold center text plus a caption", () => {
    const { host } = render(
      chartPieDonutText({
        data: [
          { key: "a", name: "Alpha", value: 10 },
          { key: "b", name: "Beta", value: 20 },
        ],
        centerCaption: "Total",
      }),
    );

    const texts = host.querySelectorAll("svg > g > text, svg text");
    expect(host.textContent).toContain("30");
    expect(host.textContent).toContain("Total");
    expect(texts.length).toBeGreaterThanOrEqual(2);
  });
});
