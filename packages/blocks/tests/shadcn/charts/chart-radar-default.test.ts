// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarDefault } from "../../../src/shadcn/charts/chart-radar-default.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarDefault", () => {
  it("renders a working demo tree with zero args: centered header, one data polygon, six month labels, trend footer", () => {
    const { host } = render(chartRadarDefault() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart");
    expect(host.querySelector("svg")).toBeTruthy();
    // One data-series outline (the only <polygon> carrying a fill-opacity attribute —
    // the polygon grid's own ring lines don't set one).
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(1);
    expect(host.querySelectorAll("svg text").length).toBe(6);
    expect(host.textContent).toContain("January");
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts custom data/title/trend props", () => {
    const { host } = render(
      chartRadarDefault({
        title: "Channel Reach",
        data: [
          { category: "Q1", value: 40 },
          { category: "Q2", value: 55 },
          { category: "Q3", value: 30 },
        ],
        series: [{ key: "value", label: "Reach", color: "info" }],
        trendText: "Down 3.1% this quarter",
        trendDirection: "down",
      }) as DomphyElement,
    );

    expect(host.querySelector("h3")?.textContent).toBe("Channel Reach");
    expect(host.querySelectorAll("svg text").length).toBe(3);
    expect(host.querySelector("footer")?.textContent).toContain("Down 3.1%");
  });
});
