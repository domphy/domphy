// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { applyBarMinHeight, resolveBarLayout } from "../src/coord/barLayout.ts";

// Truth source: ECharts' published bar layout (series-bar.barCategoryGap
// default "20%", series-bar.barGap default "30%", layout/barGrid.ts
// `calBarWidthAndOffset`). Every expected number below is computed from that
// formula by hand, not read off this implementation's output:
//   usableWidth = bandwidth * (1 - barCategoryGap)
//   barSize     = usableWidth / (seriesCount + (seriesCount - 1) * barGap)
//   gap         = barSize * barGap
describe("resolveBarLayout — ECharts barCategoryGap/barGap formula", () => {
  it("places 3 grouped bars at ECharts' barCategoryGap 20% / barGap 30% positions", () => {
    const bandwidth = 100;
    // usable = 100 * (1 - 0.20) = 80
    // barSize = 80 / (3 + 2 * 0.30) = 80 / 3.6 = 22.2222…
    // gap = 22.2222… * 0.30 = 6.6666…
    const layout = resolveBarLayout({ bandwidth, seriesCount: 3 });
    expect(layout.barSize).toBeCloseTo(80 / 3.6, 10);
    expect(layout.gap).toBeCloseTo((80 / 3.6) * 0.3, 10);
    // The three bars plus the two gaps must exactly fill the usable width.
    expect(layout.totalWidth).toBeCloseTo(80, 10);
    // Leading edges, measured from the band center (= -totalWidth / 2 + index * pitch).
    const pitch = 80 / 3.6 + (80 / 3.6) * 0.3;
    expect(layout.offsetFor(0)).toBeCloseTo(-40, 10);
    expect(layout.offsetFor(1)).toBeCloseTo(-40 + pitch, 10);
    expect(layout.offsetFor(2)).toBeCloseTo(-40 + 2 * pitch, 10);
    // …and the last bar's trailing edge closes the usable width at +40.
    expect(layout.offsetFor(2) + layout.barSize).toBeCloseTo(40, 10);
  });

  it("gives a single series 80% of the band (bandwidth * (1 - barCategoryGap))", () => {
    const layout = resolveBarLayout({ bandwidth: 50, seriesCount: 1 });
    expect(layout.barSize).toBeCloseTo(40, 10);
    expect(layout.offsetFor(0)).toBeCloseTo(-20, 10);
  });

  it("overlaps bars fully at ECharts' barGap '-100%' (the background-bar pattern)", () => {
    // divisor = 2 + 1 * (-1) = 1 → barSize = usable = 80, gap = -80.
    const layout = resolveBarLayout({
      bandwidth: 100,
      seriesCount: 2,
      barGap: "-100%",
    });
    expect(layout.barSize).toBeCloseTo(80, 10);
    expect(layout.gap).toBeCloseTo(-80, 10);
    expect(layout.offsetFor(0)).toBeCloseTo(layout.offsetFor(1), 10);
  });

  it("removes the category gap at barCategoryGap '0%'", () => {
    const layout = resolveBarLayout({
      bandwidth: 100,
      seriesCount: 1,
      barCategoryGap: "0%",
    });
    expect(layout.barSize).toBeCloseTo(100, 10);
  });

  it("lets an explicit barWidth (px or % of band) override the solved size", () => {
    expect(
      resolveBarLayout({ bandwidth: 100, seriesCount: 3, barWidth: 12 })
        .barSize,
    ).toBeCloseTo(12, 10);
    expect(
      resolveBarLayout({ bandwidth: 100, seriesCount: 3, barWidth: "50%" })
        .barSize,
    ).toBeCloseTo(50, 10);
  });

  it("clamps the solved size into [barMinWidth, barMaxWidth]", () => {
    // Solved size for one series on a 100px band is 80; clamp it down to 30.
    expect(
      resolveBarLayout({ bandwidth: 100, seriesCount: 1, barMaxWidth: 30 })
        .barSize,
    ).toBeCloseTo(30, 10);
    // Solved size for 10 series on a 100px band is 80 / (10 + 9 * 0.3) = 6.29…;
    // barMinWidth raises it to 20.
    expect(
      resolveBarLayout({ bandwidth: 100, seriesCount: 10, barMinWidth: 20 })
        .barSize,
    ).toBeCloseTo(20, 10);
  });

  it("collapses to a zero layout for a degenerate band or series count", () => {
    expect(resolveBarLayout({ bandwidth: 0, seriesCount: 3 }).barSize).toBe(0);
    expect(
      resolveBarLayout({ bandwidth: Number.NaN, seriesCount: 3 }).totalWidth,
    ).toBe(0);
    // seriesCount 0 is treated as one bar rather than dividing by zero.
    expect(
      resolveBarLayout({ bandwidth: 100, seriesCount: 0 }).barSize,
    ).toBeCloseTo(80, 10);
  });
});

// Truth source: ECharts series-bar.barMinHeight — "the minimum height of the
// bar, which can avoid the problem that the bar is too small to be seen"; a
// zero value is left at zero length.
describe("applyBarMinHeight — ECharts barMinHeight", () => {
  it("raises a short non-zero bar to barMinHeight, keeping its direction", () => {
    expect(applyBarMinHeight(1, 0.4, 8)).toBe(8);
    expect(applyBarMinHeight(-1, -0.4, 8)).toBe(-8);
  });

  it("leaves a bar that already exceeds barMinHeight untouched", () => {
    expect(applyBarMinHeight(40, 20, 8)).toBe(40);
  });

  it("leaves a zero value at zero length and is a no-op when unset", () => {
    expect(applyBarMinHeight(0, 0, 8)).toBe(0);
    expect(applyBarMinHeight(1, 0.4, undefined)).toBe(1);
  });
});

describe("BarRenderer uses the ECharts layout", () => {
  async function renderBars(series: any[], bandwidth: number) {
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
    vi.resetModules();
    const { BarRenderer } = await import("../src/gl/BarRenderer.ts");
    const { createColorResolver } = await import("../src/gl/color.ts");
    // Identity scales keep pixel space equal to data space; a zero y bandwidth
    // selects the vertical path.
    const xScale = { map: (_v: number) => 100, bandwidth: () => bandwidth };
    // Screen-space y: the grid's value axis runs bottom-to-top, so a larger
    // value maps to a SMALLER pixel y. Baseline (value 0) sits at y = 100.
    const yScale = { map: (v: number) => 100 - v, bandwidth: () => 0 };
    new BarRenderer(fakeDevice as any).render(
      {} as any,
      series,
      [xScale] as any,
      [yScale] as any,
      { x: 0, y: 0, width: 400, height: 200 },
      400,
      200,
      0,
      createColorResolver({} as any),
    );
    vi.doUnmock("@luma.gl/engine");
    vi.resetModules();
    const buffer = createdBuffers.find((b) => b.id === "bar-instances");
    expect(buffer).toBeDefined();
    // Instance layout: [x, y, w, h, r, g, b, a, radius] per bar.
    const out: { x: number; width: number; y: number; height: number }[] = [];
    const data = Array.from(buffer!.data);
    for (let base = 0; base < data.length; base += 9) {
      out.push({
        x: data[base],
        y: data[base + 1],
        width: data[base + 2],
        height: data[base + 3],
      });
    }
    return out;
  }

  it("draws 3 grouped bars at the ECharts-solved size and offsets", async () => {
    const bars = await renderBars(
      [
        { type: "bar", name: "a", data: [10] },
        { type: "bar", name: "b", data: [10] },
        { type: "bar", name: "c", data: [10] },
      ],
      100,
    );
    const barSize = 80 / 3.6;
    const pitch = barSize * 1.3;
    // Band center is at x = 100 (the x scale above). Instance data is Float32,
    // so 3 decimals is the precision the buffer can carry.
    for (const bar of bars) expect(bar.width).toBeCloseTo(barSize, 3);
    expect(bars[0].x).toBeCloseTo(100 - 40, 3);
    expect(bars[1].x).toBeCloseTo(100 - 40 + pitch, 3);
    expect(bars[2].x).toBeCloseTo(100 - 40 + 2 * pitch, 3);
  });

  it("gives a stack its own column instead of the whole band when mixed with a grouped series", async () => {
    // Truth source: ECharts' layout/barGrid.ts groups series into columns by
    // distinct `stack` id — series sharing a stack id count as ONE column,
    // same as an ungrouped series. 1 grouped + 1 stack of 2 -> seriesCount 2.
    // usable = 100 * (1 - 0.2) = 80; barSize = 80 / (2 + 1*0.3) = 80 / 2.3.
    const bars = await renderBars(
      [
        { type: "bar", name: "a", data: [10] },
        { type: "bar", name: "b", stack: "s1", data: [10] },
        { type: "bar", name: "c", stack: "s1", data: [10] },
      ],
      100,
    );
    const barSize = 80 / 2.3;
    const pitch = barSize * 1.3;
    expect(bars).toHaveLength(3);
    for (const bar of bars) expect(bar.width).toBeCloseTo(barSize, 3);
    // Column 0 (grouped "a"), column 1 (the "s1" stack — "b" and "c" share
    // the same x, stacked in y).
    expect(bars[0].x).toBeCloseTo(100 - 40, 3);
    expect(bars[1].x).toBeCloseTo(100 - 40 + pitch, 3);
    expect(bars[2].x).toBeCloseTo(100 - 40 + pitch, 3);
  });

  it("honours barWidth and barMinHeight on the drawn rect", async () => {
    const bars = await renderBars(
      [{ type: "bar", data: [0.5], barWidth: 14, barMinHeight: 6 }],
      100,
    );
    expect(bars[0].width).toBeCloseTo(14, 3);
    // Value 0.5 maps to a 0.5px tall bar; barMinHeight lifts it to 6px, still
    // anchored on the zero baseline at y = 100 and growing upward.
    expect(bars[0].height).toBeCloseTo(6, 3);
    expect(bars[0].y).toBeCloseTo(94, 3);
  });
});
