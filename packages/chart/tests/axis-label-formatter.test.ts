// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderAxes } from "../src/overlay/axes.ts";
import { createLinearScale, createOrdinalScale } from "../src/scale/index.ts";
import type { AxisOption } from "../src/types.ts";

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  svg.setAttribute("width", "400");
  svg.setAttribute("height", "300");
  document.body.appendChild(svg);
  return svg;
}

const gridRect = { x: 60, y: 40, width: 320, height: 210 };

// axisLabel.formatter is typed on AxisLabelOption (ECharts interop) but was
// silently ignored — labels always used the scale's default format.
describe("axisLabel.formatter", () => {
  it("applies a {value} string template on a category x axis", () => {
    const svg = makeSvg();
    const xAxis: AxisOption = {
      type: "category",
      data: ["Mon", "Tue"],
      axisLabel: { formatter: "{value}!" },
    };
    renderAxes(svg, {
      gridRect,
      xAxes: [xAxis],
      yAxes: [],
      xScales: [createOrdinalScale(["Mon", "Tue"], [60, 380])],
      yScales: [],
      width: 400,
      height: 300,
    });

    const labels = [...svg.querySelectorAll(".dc-axes text")].map(
      (t) => t.textContent,
    );
    expect(labels).toContain("Mon!");
    expect(labels).toContain("Tue!");
    svg.remove();
  });

  it("calls a function formatter with (value, index) on a value y axis", () => {
    const svg = makeSvg();
    const seen: [unknown, number][] = [];
    const yAxis: AxisOption = {
      type: "value",
      axisLabel: {
        formatter: (value: any, index: number) => {
          seen.push([value, index]);
          return `$${value}`;
        },
      },
    };
    renderAxes(svg, {
      gridRect,
      xAxes: [],
      yAxes: [yAxis],
      xScales: [],
      yScales: [createLinearScale([0, 100], [250, 40])],
      width: 400,
      height: 300,
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(([, index]) => typeof index === "number")).toBe(true);
    const labels = [...svg.querySelectorAll(".dc-axes text")].map(
      (t) => t.textContent,
    );
    expect(labels.some((l) => l?.startsWith("$"))).toBe(true);
    svg.remove();
  });

  it("falls back to the scale format when no formatter is set", () => {
    const svg = makeSvg();
    renderAxes(svg, {
      gridRect,
      xAxes: [{ type: "category", data: ["A"] }],
      yAxes: [],
      xScales: [createOrdinalScale(["A"], [60, 380])],
      yScales: [],
      width: 400,
      height: 300,
    });
    const labels = [...svg.querySelectorAll(".dc-axes text")].map(
      (t) => t.textContent,
    );
    expect(labels).toContain("A");
    svg.remove();
  });
});
