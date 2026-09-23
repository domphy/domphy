// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderCustom } from "../src/overlay/custom.ts";
import { createLinearScale } from "../src/scale/linear.ts";
import { createOrdinalScale } from "../src/scale/ordinal.ts";
import type { CustomSeriesOption } from "../src/types.ts";

// Truth source: ECharts' custom series renderItem contract (custom series
// doc + CustomSeries.js) — renderItem(params, api) is called once per data
// item, api.coord() maps a data value through the SAME axis scales the
// other series use, api.size() is the pixel delta between two coord() calls,
// and the returned graphic element tree (rect/circle/text/group/…) is drawn
// as-is. Before this fix `type: "custom"` had no renderer at all — nothing
// in engine.ts even dispatched to it.
function makeSvg(): SVGSVGElement {
  return document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
}

const GRID_RECT = { x: 0, y: 0, width: 300, height: 100 };

describe("renderCustom — renderItem contract", () => {
  it("api.coord() maps through the same linear scale bar/line/scatter use", () => {
    const svg = makeSvg();
    const xScale = createLinearScale([0, 10], [0, 300]);
    const yScale = createLinearScale([0, 10], [100, 0]);
    let capturedCoord: number[] | undefined;
    const series: CustomSeriesOption[] = [
      {
        type: "custom",
        data: [[5, 5]],
        renderItem: (_params, api) => {
          capturedCoord = api.coord([5, 5]);
          return {
            type: "circle",
            shape: { cx: capturedCoord[0], cy: capturedCoord[1], r: 3 },
          };
        },
      },
    ];
    renderCustom(
      svg,
      series,
      [xScale],
      [yScale],
      GRID_RECT,
      300,
      100,
      new Set(),
    );
    expect(capturedCoord).toEqual([150, 50]);
    const circle = svg.querySelector(".dc-custom circle");
    expect(circle?.getAttribute("cx")).toBe("150");
    expect(circle?.getAttribute("cy")).toBe("50");
  });

  it("api.size() returns the pixel delta between two coord() calls (bandwidth-correct on a category axis)", () => {
    const svg = makeSvg();
    const xScale = createOrdinalScale(["a", "b", "c", "d"], [0, 400]); // bandwidth 100
    const yScale = createLinearScale([0, 10], [200, 0]);
    let capturedSize: number[] | undefined;
    const series: CustomSeriesOption[] = [
      {
        type: "custom",
        data: [[1, 5]],
        renderItem: (_params, api) => {
          capturedSize = api.size([1, 0], [1, 5]);
          return {
            type: "rect",
            shape: { x: 0, y: 0, width: capturedSize[0], height: 10 },
          };
        },
      },
    ];
    renderCustom(
      svg,
      series,
      [xScale],
      [yScale],
      GRID_RECT,
      400,
      200,
      new Set(),
    );
    expect(capturedSize?.[0]).toBeCloseTo(100, 5);
  });

  // Regression: found via the shipped Custom.ts (Gantt chart) demo in real
  // Chromium — a category axis' map() clamps an out-of-domain index to the
  // last band, so a naive forward coord(base+dataSize)-coord(base) delta
  // degenerates to 0 for the LAST category (an svg <rect height="0">, and in
  // a real browser an invalid-negative-height error for a reversed axis
  // direction). Truth source: ECharts' own Gantt chart reference example
  // (api.size([0,1])[1] * ratio, used directly as a rect height) never
  // produces a zero/negative size for any row, including the last one.
  it("api.size() does not degenerate to 0 at the LAST category (axis map() clamps out-of-domain index)", () => {
    const svg = makeSvg();
    // 4 categories, indices 0..3 — index 3 is the last one.
    const xScale = createLinearScale([0, 10], [0, 300]);
    const yScale = createOrdinalScale(
      ["Design", "Dev", "Test", "Deploy"],
      [300, 0],
    ); // bandwidth 75/category
    const sizes: number[][] = [];
    const series: CustomSeriesOption[] = [
      {
        type: "custom",
        data: [
          [0, 3, 5],
          [1, 2, 5],
          [2, 1, 5],
          [3, 0, 5],
        ],
        renderItem: (_params, api) => {
          const size = api.size([0, 1]);
          sizes.push(size);
          return {
            type: "rect",
            shape: { x: 0, y: 0, width: 5, height: size[1] },
          };
        },
        encode: { x: 2, y: 1 },
      },
    ];
    renderCustom(
      svg,
      series,
      [xScale],
      [yScale],
      GRID_RECT,
      300,
      300,
      new Set(),
    );
    // Every row (including index 3, the last category) gets the same
    // non-zero band pitch — no row is invisible.
    for (const size of sizes) expect(size[1]).toBeCloseTo(75, 5);
    const heights = Array.from(svg.querySelectorAll(".dc-custom rect")).map(
      (el) => Number(el.getAttribute("height")),
    );
    expect(heights.every((h) => h > 0)).toBe(true);
  });

  it("renders a group with rect + text children at the group's translated position", () => {
    const svg = makeSvg();
    const xScale = createLinearScale([0, 10], [0, 300]);
    const yScale = createLinearScale([0, 10], [100, 0]);
    const series: CustomSeriesOption[] = [
      {
        type: "custom",
        data: [[2, 3, "task A"]],
        renderItem: (_params, api) => {
          const [x, y] = api.coord([api.value(0), api.value(1)]);
          return {
            type: "group",
            x,
            y,
            children: [
              {
                type: "rect",
                shape: { x: 0, y: 0, width: 40, height: 12 },
                style: { fill: "#123456" },
              },
              {
                type: "text",
                shape: { x: 2, y: 10 },
                style: { text: String(api.ordinalRawValue(2)), fill: "#000" },
              },
            ],
          };
        },
      },
    ];
    renderCustom(
      svg,
      series,
      [xScale],
      [yScale],
      GRID_RECT,
      300,
      100,
      new Set(),
    );
    const group = svg.querySelector(".dc-custom g g");
    expect(group).not.toBeNull();
    expect(group?.getAttribute("transform")).toContain("translate(60,70)");
    const rect = group?.querySelector("rect");
    expect(rect?.getAttribute("fill")).toBe("#123456");
    const text = group?.querySelector("text");
    expect(text?.textContent).toBe("task A");
  });

  it("api.value() reads data by dimension index, ordinalRawValue() resolves a category axis to its label", () => {
    const svg = makeSvg();
    const xScale = createOrdinalScale(["row0", "row1"], [0, 200]);
    const yScale = createLinearScale([0, 10], [100, 0]);
    let capturedLabel: string | number | undefined;
    const series: CustomSeriesOption[] = [
      {
        type: "custom",
        data: [[1, 7]],
        renderItem: (_params, api) => {
          capturedLabel = api.ordinalRawValue(0);
          return { type: "circle", shape: { cx: 0, cy: 0, r: 1 } };
        },
      },
    ];
    renderCustom(
      svg,
      series,
      [xScale],
      [yScale],
      GRID_RECT,
      200,
      100,
      new Set(),
    );
    expect(capturedLabel).toBe("row1");
  });

  it("a hidden series (legend toggle) is skipped, matching every other overlay renderer", () => {
    const svg = makeSvg();
    const xScale = createLinearScale([0, 10], [0, 300]);
    const yScale = createLinearScale([0, 10], [100, 0]);
    const series: CustomSeriesOption[] = [
      {
        type: "custom",
        name: "hidden-one",
        data: [[1, 1]],
        renderItem: () => ({ type: "circle", shape: { cx: 0, cy: 0, r: 5 } }),
      },
    ];
    renderCustom(
      svg,
      series,
      [xScale],
      [yScale],
      GRID_RECT,
      300,
      100,
      new Set(["hidden-one"]),
    );
    expect(svg.querySelector(".dc-custom circle")).toBeNull();
  });

  it("a throwing renderItem does not blank the chart — the offending series is skipped", () => {
    const svg = makeSvg();
    const xScale = createLinearScale([0, 10], [0, 300]);
    const yScale = createLinearScale([0, 10], [100, 0]);
    const series: CustomSeriesOption[] = [
      {
        type: "custom",
        data: [[1, 1]],
        renderItem: () => {
          throw new Error("boom");
        },
      },
      {
        type: "custom",
        data: [[2, 2]],
        renderItem: () => ({ type: "circle", shape: { cx: 1, cy: 1, r: 1 } }),
      },
    ];
    expect(() =>
      renderCustom(
        svg,
        series,
        [xScale],
        [yScale],
        GRID_RECT,
        300,
        100,
        new Set(),
      ),
    ).not.toThrow();
    expect(svg.querySelectorAll(".dc-custom circle")).toHaveLength(1);
  });
});
