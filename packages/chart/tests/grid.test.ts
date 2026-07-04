import { describe, expect, it } from "vitest";
import { resolveGrid } from "../src/coord/grid.ts";
import type { AxisOption, GridOption } from "../src/types.ts";

describe("resolveGrid", () => {
  it("computes the plot rect from grid left/top/right/bottom (defaults when omitted)", () => {
    const { gridRect } = resolveGrid([{}], [], [], [], 800, 400);
    // Defaults: left=60, top=40, right=20, bottom=50
    expect(gridRect).toEqual({ x: 60, y: 40, width: 720, height: 310 });
  });

  it("resolves percentage-based grid edges against the container size", () => {
    const grid: GridOption = { left: "10%", top: "10%", right: "10%", bottom: "10%" };
    const { gridRect } = resolveGrid([grid], [], [], [], 1000, 500);
    expect(gridRect).toEqual({ x: 100, y: 50, width: 800, height: 400 });
  });

  it("builds a category x-scale (backed by an ordinal ramp) with a positive bandwidth", () => {
    const xAxis: AxisOption = { type: "category", data: ["A", "B", "C"] };
    const { xScales } = resolveGrid([{}], [xAxis], [], [], 800, 400);
    expect(xScales[0].type).toBe("ordinal");
    expect(xScales[0].domain).toEqual(["A", "B", "C"]);
    expect(xScales[0].bandwidth()).toBeGreaterThan(0);
  });

  it("derives a linear y-scale's extent from series data, padded, and flips pixel direction", () => {
    const yAxis: AxisOption = { type: "value" };
    const series = [
      { yAxisIndex: 0, data: [["A", 10], ["B", 20], ["C", 5]] },
    ];
    const { yScales, gridRect } = resolveGrid([{}], [], [yAxis], series, 800, 400);
    const scale = yScales[0];
    expect(scale.type).toBe("linear");
    // Higher data value maps to a smaller pixel y (top of the chart).
    expect(scale.map(20)).toBeLessThan(scale.map(5));
    // The pixel range spans the grid rect vertically.
    expect(scale.map(20)).toBeGreaterThanOrEqual(gridRect.y - 1);
    expect(scale.map(5)).toBeLessThanOrEqual(gridRect.y + gridRect.height + 1);
  });

  it("honors explicit axis.min/max instead of the data extent", () => {
    const yAxis: AxisOption = { type: "value", min: 0, max: 100 };
    const series = [{ yAxisIndex: 0, data: [["A", 10]] }];
    const { yScales } = resolveGrid([{}], [], [yAxis], series, 800, 400);
    expect(yScales[0].domain).toEqual([0, 100]);
  });

  it("slices the visible category domain when a zoom window is applied", () => {
    const xAxis: AxisOption = { type: "category", data: ["A", "B", "C", "D"] };
    const zoom = new Map([[0, { start: 0, end: 50 }]]);
    const { xScales } = resolveGrid([{}], [xAxis], [], [], 800, 400, zoom);
    expect(xScales[0].domain).toEqual(["A", "B"]);
  });

  it("captures the full min/max range of boxplot series on the y dimension", () => {
    const yAxis: AxisOption = { type: "value" };
    // boxplot rows: [min, Q1, median, Q3, max]
    const series = [{ type: "boxplot", yAxisIndex: 0, data: [[2, 5, 8, 12, 20]] }];
    const { yScales } = resolveGrid([{}], [], [yAxis], series, 800, 400);
    const [lo, hi] = yScales[0].domain as [number, number];
    expect(lo).toBeLessThanOrEqual(2);
    expect(hi).toBeGreaterThanOrEqual(20);
  });

  it("sizes the y-extent from the cumulative stacked total, not each series' own raw values", () => {
    const yAxis: AxisOption = { type: "value" };
    // Two series sharing a stack id: rendered top is desktop+mobile per index,
    // so the axis must be sized off that sum (30), not each series' own max
    // (desktop=20, mobile=10) — otherwise a stacked area/bar's top layer
    // overflows past an axis auto-sized from individual-series maxima.
    const series = [
      { yAxisIndex: 0, stack: "total", data: [10, 20] },
      { yAxisIndex: 0, stack: "total", data: [5, 10] },
    ];
    const { yScales } = resolveGrid([{}], [], [yAxis], series, 800, 400);
    const [, hi] = yScales[0].domain as [number, number];
    expect(hi).toBeGreaterThanOrEqual(30);
  });

  it("keeps unrelated stack groups and non-stacked series independent when computing extent", () => {
    const yAxis: AxisOption = { type: "value" };
    const series = [
      { yAxisIndex: 0, stack: "a", data: [10] },
      { yAxisIndex: 0, stack: "a", data: [10] }, // stack "a" cumulative total: 20
      { yAxisIndex: 0, stack: "b", data: [100] }, // separate stack, unaffected by "a"
      { yAxisIndex: 0, data: [1] }, // non-stacked, contributes its own raw value
    ];
    const { yScales } = resolveGrid([{}], [], [yAxis], series, 800, 400);
    const [lo, hi] = yScales[0].domain as [number, number];
    expect(lo).toBeLessThanOrEqual(1);
    expect(hi).toBeGreaterThanOrEqual(100);
  });

  it("falls back to a default extent when no series data is present", () => {
    const yAxis: AxisOption = { type: "value" };
    const { yScales } = resolveGrid([{}], [], [yAxis], [], 800, 400);
    expect(yScales[0].domain).toEqual([-0.02, 1.05]);
  });
});
