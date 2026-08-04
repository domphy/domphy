// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { resolveGrid } from "../src/coord/grid.ts";
import { accumStackedLines } from "../src/engine.ts";
import type { LineSeriesOption } from "../src/types.ts";

// ECharts stacks positive values up from the zero baseline and negative values
// down, tracking one running total per sign — not a single naive running
// total. These tests pin the mixed-sign behavior across all three places the
// engine accumulates stacks (accumStackedLines, BarRenderer, and the grid's
// axis-extent pass) plus the same-sign regressions, which must match the old
// single-total math exactly.
describe("mixed-sign stacking: accumStackedLines (line/area stacks)", () => {
  it("stacks positive values up from zero and negative values down from zero", () => {
    const { series, baselines } = accumStackedLines([
      { type: "line", name: "a", stack: "s", data: [10, 5] },
      { type: "line", name: "b", stack: "s", data: [-4, -2] },
      { type: "line", name: "c", stack: "s", data: [1, 2] },
    ] as LineSeriesOption[]);

    // The negative series accumulates on its own below-zero track — a naive
    // running total would have placed it at 10-4=6 / 5-2=3 instead.
    expect(series[0].data).toEqual([10, 5]);
    expect(series[1].data).toEqual([-4, -2]);
    // The third (positive) series stacks on the POSITIVE total only, ignoring
    // the negative track.
    expect(series[2].data).toEqual([11, 7]);
    expect(baselines[0]).toEqual([0, 0]);
    expect(baselines[1]).toEqual([0, 0]);
    expect(baselines[2]).toEqual([10, 5]);
  });

  it("matches the old single running total for all-positive stacks", () => {
    const { series, baselines } = accumStackedLines([
      { type: "line", stack: "s", data: [3, 4] },
      { type: "line", stack: "s", data: [5, 6] },
    ] as LineSeriesOption[]);
    expect(series[1].data).toEqual([8, 10]);
    expect(baselines[1]).toEqual([3, 4]);
  });

  it("matches the old single running total for all-negative stacks", () => {
    const { series, baselines } = accumStackedLines([
      { type: "line", stack: "s", data: [-3, -4] },
      { type: "line", stack: "s", data: [-5, -6] },
    ] as LineSeriesOption[]);
    expect(series[1].data).toEqual([-8, -10]);
    expect(baselines[1]).toEqual([-3, -4]);
  });
});

describe("mixed-sign stacking: BarRenderer segments", () => {
  async function renderBars(
    series: any[],
    orientation: "vertical" | "horizontal",
  ): Promise<number[]> {
    const createdBuffers: { id?: string; data: Float32Array }[] = [];
    const fakeDevice = {
      createBuffer: ({ data, id }: { data: Float32Array; id?: string }) => {
        const buffer = { data, id, destroy: () => {} };
        createdBuffers.push(buffer);
        return buffer;
      },
    };

    vi.doMock("@luma.gl/engine", () => ({
      Model: class {
        props: Record<string, unknown> = {};
        setAttributes(_attrs: unknown) {}
        setVertexCount(_count: number) {}
        setInstanceCount(_count: number) {}
        draw(_renderPass: unknown) {}
      },
    }));
    // Drop the already-evaluated real modules (engine.ts statically imports
    // BarRenderer with the real Model) so the re-import below evaluates
    // against the mocked @luma.gl/engine.
    vi.resetModules();

    const { BarRenderer } = await import("../src/gl/BarRenderer.ts");
    const { createColorResolver } = await import("../src/gl/color.ts");

    // Identity scales keep pixel-space arithmetic equal to data-space. The
    // vertical path is selected when the y bandwidth is zero; a non-zero y
    // bandwidth selects the horizontal path.
    const identity = { map: (v: number) => v, bandwidth: () => 0 } as any;
    const banded = { map: (v: number) => v, bandwidth: () => 10 } as any;
    const xScale = identity;
    const yScale = orientation === "vertical" ? identity : banded;

    const renderer = new BarRenderer(fakeDevice as any);
    renderer.render(
      {} as any,
      series,
      [xScale],
      [yScale],
      { x: 0, y: 0, width: 100, height: 100 },
      100,
      100,
      0,
      createColorResolver({} as any),
    );

    vi.doUnmock("@luma.gl/engine");
    vi.resetModules();

    const buffer = createdBuffers.find((b) => b.id === "bar-instances");
    expect(buffer).toBeDefined();
    return Array.from(buffer!.data);
  }

  // Instance layout: [x, y, w, h, r, g, b, a, radius] per bar.
  function rects(data: number[]): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i < data.length; i += 9)
      out.push([data[i + 1], data[i + 3]]);
    return out;
  }

  it("stacks a negative series below zero while a positive series stacks above (vertical)", async () => {
    const data = await renderBars(
      [
        { type: "bar", name: "a", stack: "s", data: [10, 5] },
        { type: "bar", name: "b", stack: "s", data: [-4, -2] },
      ],
      "vertical",
    );
    // [y, height] per bar, in render order (a0, a1, b0, b1). The negative
    // series hangs from zero downward on its own track — a naive total would
    // have shrunk the positive bars instead (rects 6→10 and 3→5).
    expect(rects(data)).toEqual([
      [0, 10],
      [0, 5],
      [-4, 4],
      [-2, 2],
    ]);
  });

  it("stacks a negative series left of zero (horizontal)", async () => {
    const data = await renderBars(
      [
        { type: "bar", name: "a", stack: "s", data: [10] },
        { type: "bar", name: "b", stack: "s", data: [-4] },
      ],
      "horizontal",
    );
    // Horizontal instances are [x, y, w, h, …] — assert [x, width]: the
    // positive bar spans 0→10, the negative one -4→0 (naive: 6→10).
    const xw: [number, number][] = [];
    for (let i = 0; i < data.length; i += 9) xw.push([data[i], data[i + 2]]);
    expect(xw).toEqual([
      [0, 10],
      [-4, 4],
    ]);
  });

  it("matches the old single running total for all-positive stacks (vertical)", async () => {
    const data = await renderBars(
      [
        { type: "bar", name: "a", stack: "s", data: [3] },
        { type: "bar", name: "b", stack: "s", data: [5] },
      ],
      "vertical",
    );
    expect(rects(data)).toEqual([
      [0, 3],
      [3, 5],
    ]);
  });
});

describe("mixed-sign stacking: axis extent", () => {
  it("sizes the value axis to both the positive and negative stack extremes", () => {
    const { yScales } = resolveGrid(
      [{}],
      [{ type: "category", data: ["a", "b"] }],
      [{ type: "value" }],
      [
        { type: "bar", stack: "s", data: [10, 5] },
        { type: "bar", stack: "s", data: [-4, -2] },
      ],
      800,
      400,
    );
    const scale = yScales[0] as any;
    // The negative track reaches -4 (below zero) while the positive track
    // tops out at 10 — a naive running total would report extent [3, 10]
    // (10, 10-4=6, 5, 5-2=3) and clip the below-zero bars. The axis pads the
    // extent outward, so assert containment.
    expect(scale.domain[0]).toBeLessThanOrEqual(-4);
    expect(scale.domain[1]).toBeGreaterThanOrEqual(10);
  });

  it("matches the old extent for all-positive stacks", () => {
    const { yScales } = resolveGrid(
      [{}],
      [{ type: "category", data: ["a", "b"] }],
      [{ type: "value" }],
      [
        { type: "bar", stack: "s", data: [3, 4] },
        { type: "bar", stack: "s", data: [5, 6] },
      ],
      800,
      400,
    );
    const scale = yScales[0] as any;
    expect(scale.domain[0]).toBeLessThanOrEqual(3);
    expect(scale.domain[1]).toBeGreaterThanOrEqual(10);
  });
});
