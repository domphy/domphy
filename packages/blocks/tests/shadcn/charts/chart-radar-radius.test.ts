// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadarRadius } from "../../../src/shadcn/charts/chart-radar-radius.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarRadius", () => {
  it("renders the multi-series chart with numeric radius-axis tick labels and no axis line", () => {
    const { host } = render(chartRadarRadius() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe(
      "Radar Chart - Radius Axis",
    );
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(2);
    // Six radial spokes (the default grid) only -- upstream's
    // <PolarRadiusAxis axisLine={false}> draws no separate radius-axis line.
    expect(host.querySelectorAll("svg line").length).toBe(6);
    // The numeric radius-axis tick labels (0, 100, 200, 300 for this
    // dataset's max of 305) render as <text>, matching PolarRadiusAxis's
    // default tick rendering. This recipe omits the angle axis entirely
    // (matching the reference), so these are the only <text> nodes -- no
    // month-name perimeter labels.
    const ticks = Array.from(host.querySelectorAll("svg text")).map(
      (node) => node.textContent,
    );
    expect(ticks).toEqual(["0", "100", "200", "300"]);
  });

  it("positions the radius-axis tick labels along the given radiusAxisAngle", () => {
    const { host } = render(
      chartRadarRadius({ radiusAxisAngle: 0 }) as DomphyElement,
    );
    const ticks = Array.from(host.querySelectorAll("svg text"));
    expect(ticks.length).toBeGreaterThan(0);
    // Angle 0 points straight up from the chart's center, so every tick sits
    // on the vertical centerline (x === RADAR_CENTER).
    for (const tick of ticks) {
      expect(tick.getAttribute("x")).toBe("100");
    }
  });
});
