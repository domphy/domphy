import { describe, expect, it } from "vitest";
import { resolveGrid } from "../src/coord/grid.js";

const VALUE_AXIS = [{ type: "value" }] as any;

describe("grid scale resolution edge cases", () => {
  it("ECharts semantics: scalar data on a value x axis is positioned by item index, so index 4 of 5 stays inside the plot rect", () => {
    const { gridRect, xScales } = resolveGrid(
      [{}],
      VALUE_AXIS,
      VALUE_AXIS,
      [{ type: "line", data: [10, 20, 30, 40, 50] }],
      400,
      300,
    );
    const right = gridRect.x + gridRect.width;
    expect(xScales[0].map(0 as any)).toBeGreaterThanOrEqual(gridRect.x);
    expect(xScales[0].map(4 as any)).toBeLessThanOrEqual(right);
  });

  it("ECharts semantics: a horizontal bar chart (category y axis) reads a scalar datum as the x value", () => {
    const { xScales } = resolveGrid(
      [{}],
      VALUE_AXIS,
      [{ type: "category", data: ["a", "b", "c"] }] as any,
      [{ type: "bar", data: [70, 120, 200] }],
      400,
      300,
    );
    expect((xScales[0] as any).domain[1]).toBeGreaterThanOrEqual(200);
  });

  // ECharts Axis#getBandWidth(): size / (n - 1 + (onBand ? 1 : 0)) — never 0,
  // so a band-sized series stays visible on a boundaryGap:false axis.
  it("ECharts semantics: boundaryGap:false still yields a non-zero band width", () => {
    const { xScales, gridRect } = resolveGrid(
      [{}],
      [{ type: "category", data: ["a", "b", "c"], boundaryGap: false }] as any,
      VALUE_AXIS,
      [
        {
          type: "candlestick",
          data: [
            [1, 2, 0, 3],
            [1, 2, 0, 3],
            [1, 2, 0, 3],
          ],
        },
      ],
      400,
      300,
    );
    // ECharts places category 0 on the axis origin and the last on the far
    // edge when onBand is false, and the band is size/(n-1), not zero.
    const { x, width } = gridRect;
    expect(xScales[0].map("a")).toBeCloseTo(x, 6);
    expect(xScales[0].map("c")).toBeCloseTo(x + width, 6);
    expect(xScales[0].bandwidth()).toBeGreaterThan(0);
    expect(xScales[0].bandwidth()).toBeLessThanOrEqual(width / 2);
  });

  it("geometry: a container smaller than the axis margins yields a collapsed, never a negative, grid rect", () => {
    const { gridRect } = resolveGrid(
      [{}],
      [{}] as any,
      [{}] as any,
      [],
      100,
      60,
    );
    expect(gridRect.width).toBeGreaterThanOrEqual(0);
    expect(gridRect.height).toBeGreaterThanOrEqual(0);
  });
});
