// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { resolveGrid } from "../src/coord/grid.ts";
import { renderAxes } from "../src/overlay/axes.ts";
import { createLinearScale } from "../src/scale/index.ts";
import type { AxisOption } from "../src/types.ts";

const CATEGORY_X: AxisOption = {
  type: "category",
  data: ["Mon", "Tue", "Wed"],
};

describe("value axis zero baseline (ECharts: a bar's rect is drawn from the axis zero)", () => {
  it("includes zero above positive-only bar data, so map(0) lands on the plot floor", () => {
    const { yScales, gridRect } = resolveGrid(
      [{}],
      [CATEGORY_X],
      [{ type: "value" }],
      [{ type: "bar", data: [120, 200, 150] }],
      800,
      400,
    );
    // ECharts semantics: min is pinned to 0 (never padded below it) so the
    // baseline every bar is drawn from coincides with the axis line.
    expect(yScales[0].map(0)).toBe(gridRect.y + gridRect.height);
  });

  it("includes zero below negative-only bar data, so map(0) lands on the plot ceiling", () => {
    const { yScales, gridRect } = resolveGrid(
      [{}],
      [CATEGORY_X],
      [{ type: "value" }],
      [{ type: "bar", data: [-5, -20, -12] }],
      800,
      400,
    );
    expect(yScales[0].map(0)).toBe(gridRect.y);
  });

  it("leaves a line-only axis free to auto-range away from zero", () => {
    const { yScales } = resolveGrid(
      [{}],
      [CATEGORY_X],
      [{ type: "value" }],
      [{ type: "line", data: [120, 200, 150] }],
      800,
      400,
    );
    // ECharts does not force zero for line series — the axis hugs the data.
    expect(
      (yScales[0] as { domain: [number, number] }).domain[0],
    ).toBeGreaterThan(100);
  });

  it("an explicit axis.min still wins over the zero baseline", () => {
    const { yScales } = resolveGrid(
      [{}],
      [CATEGORY_X],
      [{ type: "value", min: 50 }],
      [{ type: "bar", data: [120, 200, 150] }],
      800,
      400,
    );
    expect((yScales[0] as { domain: [number, number] }).domain[0]).toBe(50);
  });
});

describe("time axis auto extent (ECharts: a time axis ranges over the series' date values)", () => {
  it("reads the extent from [dateString, value] pairs", () => {
    const { xScales, gridRect } = resolveGrid(
      [{}],
      [{ type: "time" }],
      [{ type: "value" }],
      [
        {
          type: "line",
          data: [
            ["2024-01-01", 10],
            ["2024-06-01", 20],
            ["2024-12-01", 15],
          ],
        },
      ],
      800,
      400,
    );
    const scale = xScales[0] as { domain: [Date, Date] };
    expect(scale.domain[0].toISOString()).toBe(
      new Date("2024-01-01").toISOString(),
    );
    expect(scale.domain[1].toISOString()).toBe(
      new Date("2024-12-01").toISOString(),
    );
    // The first datum therefore sits on the left edge of the plot, not
    // millions of pixels away (epoch 0 fallback).
    expect(xScales[0].map("2024-01-01" as never)).toBe(gridRect.x);
  });

  it("reads the extent from Date objects too", () => {
    const { xScales } = resolveGrid(
      [{}],
      [{ type: "time" }],
      [{ type: "value" }],
      [
        {
          type: "line",
          data: [
            [new Date("2020-01-01"), 1],
            [new Date("2021-01-01"), 2],
          ],
        },
      ],
      800,
      400,
    );
    const scale = xScales[0] as { domain: [Date, Date] };
    expect(scale.domain[1].getUTCFullYear()).toBe(2021);
  });

  it('accepts the "dataMin"/"dataMax" literals instead of coercing them to NaN', () => {
    const { xScales } = resolveGrid(
      [{}],
      [{ type: "time", min: "dataMin", max: "dataMax" }],
      [{ type: "value" }],
      [
        {
          type: "line",
          data: [
            ["2024-01-01", 1],
            ["2024-02-01", 2],
          ],
        },
      ],
      800,
      400,
    );
    const scale = xScales[0] as { domain: [Date, Date] };
    expect(Number.isNaN(scale.domain[0].getTime())).toBe(false);
    expect(scale.domain[0].toISOString()).toBe(
      new Date("2024-01-01").toISOString(),
    );
  });
});

describe("axis.inverse (ECharts: flips the value→pixel direction)", () => {
  it("maps the domain minimum to the top of a y axis", () => {
    const { yScales, gridRect } = resolveGrid(
      [{}],
      [CATEGORY_X],
      [{ type: "value", inverse: true }],
      [{ type: "bar", data: [10, 20, 30] }],
      800,
      400,
    );
    // Non-inverted, 0 sits on the plot floor (see above); inverted it is the ceiling.
    expect(yScales[0].map(0)).toBe(gridRect.y);
  });
});

describe("axis.splitNumber (ECharts: requested number of axis intervals)", () => {
  it("drives the tick count instead of being ignored", () => {
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement;
    svg.setAttribute("width", "400");
    svg.setAttribute("height", "300");
    document.body.appendChild(svg);
    const gridRect = { x: 60, y: 40, width: 320, height: 210 };
    const scale = createLinearScale([0, 100], [250, 40]);
    renderAxes(svg, {
      gridRect,
      xAxes: [],
      yAxes: [{ type: "value", splitNumber: 2 }],
      xScales: [],
      yScales: [scale],
      width: 400,
      height: 300,
    });
    const labels = [...svg.querySelectorAll(".dc-axes text")].map(
      (t) => t.textContent,
    );
    // splitNumber 2 over [0, 100] nices to a step of 50 → 0 / 50 / 100.
    expect(labels).toEqual(["0", "50", "100"]);
  });
});
