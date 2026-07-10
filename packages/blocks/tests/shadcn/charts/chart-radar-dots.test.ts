// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarDots } from "../../../src/shadcn/charts/chart-radar-dots.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarDots", () => {
  it("renders the default radar shape plus one solid dot per vertex", () => {
    const { host } = render(chartRadarDots() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart - Dots");
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(1);
    expect(host.querySelectorAll("svg circle").length).toBe(6);
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("can hide the dots via showDots: false", () => {
    const { host } = render(
      chartRadarDots({ showDots: false }) as DomphyElement,
    );
    expect(host.querySelectorAll("svg circle").length).toBe(0);
  });
});
