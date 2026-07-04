import { describe, expect, it, vi } from "vitest";

// Regression: LineRenderer's area fill used to always draw from the value-axis
// zero line (`yScale.map(0)`) as the bottom edge, for every series — so a
// stacked series' fill fully covered every series beneath it in the same
// stack instead of drawing a band between the previous cumulative curve and
// its own. This mirrors gl/BarRenderer.ts's stacked bars, which already drew
// each segment between the previous cumulative top and the new one.
describe("LineRenderer stacked area-fill baseline", () => {
  it("draws the area band between the supplied per-series baseline and its own curve, not a flat zero line", async () => {
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
        constructor(_device: unknown, _config: unknown) {}
        setAttributes(_attrs: unknown) {}
        setVertexCount(_count: number) {}
        draw(_renderPass: unknown) {}
      },
    }));

    const { LineRenderer } = await import("../src/gl/LineRenderer.ts");

    // Identity scales keep the pixel-space arithmetic equal to the data-space
    // arithmetic, so the expected vertex values are easy to state directly.
    const identityScale = { map: (v: number) => v, bandwidth: () => 0 } as any;

    const renderer = new LineRenderer(fakeDevice as any);
    const series = [
      {
        type: "line",
        data: [10, 20],
        areaStyle: { opacity: 0.4 },
      } as any,
    ];
    // Simulates accumStackedLines' output: this series stacks on top of a
    // prior series whose cumulative value was 0 at index 0 and 5 at index 1.
    const baselines = [[0, 5]];

    renderer.render(
      {} as any,
      series,
      [identityScale],
      [identityScale],
      { x: 0, y: 0, width: 100, height: 100 },
      100,
      100,
      0,
      baselines,
    );

    const areaBuffer = createdBuffers.find((b) => b.id === "line-area");
    expect(areaBuffer).toBeDefined();
    const verts = Array.from(areaBuffer!.data);
    // 6 vertices per segment quad: (x0,by0) (x1,by1) (x0,y0) (x1,by1) (x1,y1) (x0,y0)
    expect(verts).toEqual([
      0, 0, 1, 5, 0, 10,
      1, 5, 1, 20, 0, 10,
    ]);
    // The bottom edge is NOT a flat zero line (the pre-fix behavior) — it
    // varies per point, following the supplied baseline (0, then 5).
    const bottomEdgeYs = [verts[1], verts[3]];
    expect(bottomEdgeYs).toEqual([0, 5]);

    vi.doUnmock("@luma.gl/engine");
    vi.resetModules();
  });

  it("falls back to the plain zero baseline when no stacked baseline is supplied (non-stacked series)", async () => {
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
        constructor(_device: unknown, _config: unknown) {}
        setAttributes(_attrs: unknown) {}
        setVertexCount(_count: number) {}
        draw(_renderPass: unknown) {}
      },
    }));

    const { LineRenderer } = await import("../src/gl/LineRenderer.ts");
    const identityScale = { map: (v: number) => v, bandwidth: () => 0 } as any;

    const renderer = new LineRenderer(fakeDevice as any);
    const series = [
      {
        type: "line",
        data: [10, 20],
        areaStyle: { opacity: 0.4 },
      } as any,
    ];

    // No `baselines` argument at all — matches a plain (non-stacked) series.
    renderer.render(
      {} as any,
      series,
      [identityScale],
      [identityScale],
      { x: 0, y: 0, width: 100, height: 100 },
      100,
      100,
      0,
    );

    const areaBuffer = createdBuffers.find((b) => b.id === "line-area");
    const verts = Array.from(areaBuffer!.data);
    const bottomEdgeYs = [verts[1], verts[3]];
    expect(bottomEdgeYs).toEqual([0, 0]);

    vi.doUnmock("@luma.gl/engine");
    vi.resetModules();
  });
});
