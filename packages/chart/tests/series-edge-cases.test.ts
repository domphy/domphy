// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { resolveGrid } from "../src/coord/grid.ts";
import { computePieSlices } from "../src/gl/PieRenderer.ts";
import { renderAxes } from "../src/overlay/axes.ts";
import { reserveDataZoomSpace } from "../src/overlay/datazoom.ts";
import { createTimeScale } from "../src/scale/index.ts";
import type { PieSeriesOption } from "../src/types.ts";

const FULL_TURN = Math.PI * 2;

describe("candlestick axis extent (ECharts: data is [open, close, lowest, highest])", () => {
  it("covers the wick, not just the close price", () => {
    const { yScales, gridRect } = resolveGrid(
      [{}],
      [{ type: "category", data: ["a", "b"] }],
      [{ type: "value" }],
      [
        {
          type: "candlestick",
          data: [
            [10, 20, 5, 25],
            [15, 12, 10, 18],
          ],
        },
      ],
      800,
      400,
    );
    // The lowest low (5) and the highest high (25) must both map inside the
    // plot rect; before this the axis only spanned the close values.
    const top = gridRect.y;
    const bottom = gridRect.y + gridRect.height;
    expect(yScales[0].map(5)).toBeLessThanOrEqual(bottom);
    expect(yScales[0].map(5)).toBeGreaterThanOrEqual(top);
    expect(yScales[0].map(25)).toBeGreaterThanOrEqual(top);
    expect(yScales[0].map(25)).toBeLessThanOrEqual(bottom);
  });
});

describe("pie slice values (ECharts: only positive finite values are summed)", () => {
  const pie = (data: PieSeriesOption["data"]): PieSeriesOption =>
    ({ type: "pie", data }) as PieSeriesOption;

  it("a NaN or negative datum does not change the other slices' angles", () => {
    const clean = computePieSlices(
      pie([
        { name: "a", value: 60 },
        { name: "b", value: 40 },
      ]),
      400,
      400,
    );
    const dirty = computePieSlices(
      pie([
        { name: "a", value: 60 },
        { name: "nan", value: Number.NaN },
        { name: "b", value: 40 },
        { name: "neg", value: -50 },
      ]),
      400,
      400,
    );
    expect(dirty[0].fraction).toBeCloseTo(clean[0].fraction, 10);
    expect(dirty[2].fraction).toBeCloseTo(clean[1].fraction, 10);
    expect(dirty[1].fraction).toBe(0);
    expect(dirty[3].fraction).toBe(0);
  });

  it("a single positive datum sweeps the whole circle", () => {
    const [slice] = computePieSlices(
      pie([{ name: "only", value: 7 }]),
      400,
      400,
    );
    expect(slice.fraction).toBe(1);
    expect(Math.abs(slice.endAngle - slice.startAngle)).toBeCloseTo(
      FULL_TURN,
      10,
    );
  });
});

describe("dataZoom layout (ECharts: a slider participates in layout, the grid shrinks for it)", () => {
  it("leaves the x axis tick labels above the slider", () => {
    const height = 400;
    const dataZoom = { type: "slider" as const, xAxisIndex: 0 };
    const grids = reserveDataZoomSpace([{}], [dataZoom]);
    const { gridRect } = resolveGrid(
      grids,
      [{ type: "category", data: ["a", "b"] }],
      [{ type: "value" }],
      [{ type: "bar", data: [1, 2] }],
      600,
      height,
    );
    // createDataZoomSlider places the slider at svgHeight - bottom - height,
    // defaulting to 10 and 30; renderAxes puts the tick label baseline at
    // gridBottom + 18 with hanging 11px glyphs.
    const sliderTop = height - 10 - 30;
    const labelBottom = gridRect.y + gridRect.height + 18 + 11;
    expect(labelBottom).toBeLessThanOrEqual(sliderTop);
  });

  it("leaves an explicit grid.bottom alone", () => {
    const [grid] = reserveDataZoomSpace(
      [{ bottom: 4 }],
      [{ type: "slider", xAxisIndex: 0 }],
    );
    expect(grid.bottom).toBe(4);
  });

  it("an inside dataZoom has no UI and reserves nothing", () => {
    const grids = [{}];
    expect(reserveDataZoomSpace(grids, [{ type: "inside" }])).toBe(grids);
  });
});

describe("axis label crowding (WCAG/legibility: labels must not overlap)", () => {
  it("thins labels on a narrow time axis instead of printing one per tick", () => {
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement;
    svg.setAttribute("width", "260");
    svg.setAttribute("height", "220");
    document.body.appendChild(svg);
    // 140px of plot for a year of data: at ~40px per "Mar 1" label only 3 fit.
    const gridRect = { x: 60, y: 20, width: 140, height: 150 };
    const scale = createTimeScale(
      [new Date("2024-01-01"), new Date("2024-12-01")],
      [gridRect.x, gridRect.x + gridRect.width],
    );
    renderAxes(svg, {
      gridRect,
      xAxes: [{ type: "time" }],
      yAxes: [],
      xScales: [scale],
      yScales: [],
      width: 260,
      height: 220,
    });
    const labels = [...svg.querySelectorAll(".dc-axes text")];
    const ticks = scale.ticks(6).length;
    expect(labels.length).toBeLessThan(ticks);
    // And what is drawn does not collide: x positions are at least 40px apart.
    const xs = labels
      .map((t) => Number(t.getAttribute("x")))
      .sort((a, b) => a - b);
    for (let index = 1; index < xs.length; index++) {
      expect(xs[index] - xs[index - 1]).toBeGreaterThanOrEqual(40);
    }
  });
});

describe("heatmap visualMap (ECharts: visualMap.min/max drive the cell colour)", () => {
  it("paints a cell the colour the visualMap legend shows for that value, and leaves out-of-range cells undrawn", async () => {
    const created: { id?: string; data: Float32Array }[] = [];
    const fakeDevice = {
      createBuffer: ({ data, id }: { data: Float32Array; id?: string }) => {
        const buffer = { data, id, destroy: () => {} };
        created.push(buffer);
        return buffer;
      },
    };
    vi.doMock("@luma.gl/engine", () => ({
      Model: class {
        props: Record<string, unknown> = {};
        setAttributes(_attrs: unknown) {}
        setVertexCount(_count: number) {}
        draw(_renderPass: unknown) {}
      },
    }));

    const { HeatmapRenderer } = await import("../src/gl/HeatmapRenderer.ts");
    const { colorFromVisualMap } = await import("../src/overlay/visualmap.ts");

    const identity = { map: (v: number) => v, bandwidth: () => 10 } as any;
    const visualMap = { type: "continuous", min: 0, max: 10 } as any;
    new HeatmapRenderer(fakeDevice as any).render(
      {} as any,
      [
        {
          type: "heatmap",
          data: [
            [0, 0, 3],
            [1, 0, 9],
            // Above visualMap.max: ECharts' getValueState calls it outOfRange,
            // whose default visual is rgba(0,0,0,0) — nothing is drawn.
            [2, 0, 15],
          ],
        } as any,
      ],
      [identity],
      [identity],
      100,
      100,
      [visualMap],
    );

    const colors = created.find((b) => b.id === "heatmap-color")?.data;
    // 2 in-range cells x 6 vertices; the 15 is dropped.
    expect(colors?.length).toBe(2 * 6 * 4);

    // The cell colour must be the one the legend ramp shows at that value —
    // the whole point of wiring visualMap.min/max into the renderer.
    const expected = (value: number) =>
      colorFromVisualMap(visualMap, value)
        .replace(/[^0-9,]/g, "")
        .split(",")
        .map((channel) => Number(channel) / 255);
    // Float32 rounding, hence toBeCloseTo rather than an exact compare.
    const expectCell = (offset: number, value: number) => {
      const want = expected(value);
      for (let channel = 0; channel < 3; channel++)
        expect(colors?.[offset + channel]).toBeCloseTo(want[channel], 6);
    };
    expectCell(0, 3);
    expectCell(24, 9);
  });
});
