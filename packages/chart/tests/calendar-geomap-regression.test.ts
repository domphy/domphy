// @vitest-environment jsdom

// Regression tests for the /docs/chart/examples failures: the Calendar
// Heatmap demo rendered every cell at NaN (cellSize "auto" was fed into
// coordinate math), the Choropleth demo's visualMap legend landed at NaN
// (`left: "left"` hit parseFloat), and the EffectScatter demo crashed
// setOption with "item is not iterable" on { name, value } data objects.

import { afterEach, describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import { registerMap } from "../src/overlay/geomap.ts";
import type { ChartOption } from "../src/types.ts";

function makeEngine(): { engine: ChartEngine; svg: SVGSVGElement } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const engine = new ChartEngine(container);
  engine.setSize(400, 300);
  // render() only needs beginRenderPass/submit — WebGL renderers stay null
  // without init(), so their render() branches are skipped entirely.
  (engine as any).device = {
    beginRenderPass: () => ({ end() {} }),
    submit() {},
  };
  return { engine, svg: (engine as any).overlaysvg as SVGSVGElement };
}

function countNaNAttrs(root: ParentNode): number {
  let count = 0;
  for (const el of root.querySelectorAll("*")) {
    for (const attr of Array.from(el.attributes ?? [])) {
      if (attr.value.includes("NaN")) count++;
    }
  }
  return count;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("calendar heatmap", () => {
  const calendarOption: ChartOption = {
    visualMap: {
      type: "continuous",
      min: 0,
      max: 8,
      orient: "horizontal",
      left: "center",
      top: 4,
      inRange: { color: ["#ebedf0", "#216e39"] },
    },
    calendar: {
      range: "2024",
      cellSize: ["auto", 15],
      top: 50,
      left: 50,
      right: 20,
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        calendarIndex: 0,
        data: [
          ["2024-01-01", 3],
          ["2024-06-15", 7],
          ["2024-12-31", 1],
        ],
      } as any,
    ],
  };

  it('resolves cellSize "auto" to finite cell coordinates', () => {
    const { engine, svg } = makeEngine();
    engine.setOption(calendarOption);

    // 2024 is a leap year — one rect per day, none at NaN.
    const rects = [...svg.querySelectorAll(".dc-calendar rect")];
    expect(rects.length).toBe(366);
    for (const rect of rects) {
      for (const name of ["x", "y", "width", "height"]) {
        const value = Number(rect.getAttribute(name));
        expect(Number.isFinite(value), `${name}=${value}`).toBe(true);
      }
    }
    expect(countNaNAttrs(svg)).toBe(0);
  });

  it("does not draw cartesian axes for a calendar-bound heatmap", () => {
    const { engine, svg } = makeEngine();
    engine.setOption(calendarOption);
    expect(svg.querySelector(".dc-axes")).toBeNull();
  });
});

describe("visualMap positioning", () => {
  it('resolves left: "left" + bottom offset without NaN', () => {
    const { engine, svg } = makeEngine();
    engine.setOption({
      visualMap: {
        type: "continuous",
        min: 0,
        max: 26,
        left: "left",
        bottom: 20,
        text: ["High", "Low"],
        inRange: { color: ["#e0f3f8", "#313695"] },
      },
      series: [{ type: "map", map: "world", data: [] } as any],
    });
    expect(countNaNAttrs(svg.querySelector(".dc-visualmap")!)).toBe(0);
  });
});

describe("effectScatter", () => {
  it("accepts { name, value } data items without throwing", () => {
    const { engine, svg } = makeEngine();
    const option: ChartOption = {
      xAxis: {},
      yAxis: {},
      series: [
        {
          type: "effectScatter",
          coordinateSystem: "cartesian2d",
          symbolSize: (val: number[]) => val[2],
          data: [
            { name: "a", value: [1, 2, 10] },
            { name: "b", value: [3, 4, 20] },
          ],
        } as any,
      ],
    };
    expect(() => engine.setOption(option)).not.toThrow();
    const circles = svg.querySelectorAll(".dc-effect-scatter circle");
    expect(circles.length).toBeGreaterThan(0);
    expect(countNaNAttrs(svg)).toBe(0);
  });
});

describe("map series (choropleth)", () => {
  it("renders finite path data for a registered map", () => {
    registerMap("test-square", {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Squareland" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ],
          },
        },
      ],
    });

    const { engine, svg } = makeEngine();
    const option: ChartOption = {
      visualMap: {
        type: "continuous",
        min: 0,
        max: 10,
        left: "left",
        bottom: 20,
        inRange: { color: ["#e0f3f8", "#313695"] },
      },
      series: [
        {
          type: "map",
          map: "test-square",
          data: [{ name: "Squareland", value: 5 }],
        } as any,
      ],
    };
    expect(() => engine.setOption(option)).not.toThrow();

    const paths = [...svg.querySelectorAll(".dc-geomap path")];
    expect(paths.length).toBe(1);
    const d = paths[0].getAttribute("d") ?? "";
    expect(d.startsWith("M")).toBe(true);
    expect(d).not.toContain("NaN");
    expect(countNaNAttrs(svg)).toBe(0);
  });
});
