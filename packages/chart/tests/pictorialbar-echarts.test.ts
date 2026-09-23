// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderPictorialBar } from "../src/overlay/pictorialbar.ts";
import type { PictorialBarSeriesOption } from "../src/types.ts";

// Truth source: ECharts' layout/barGrid.ts calBarWidthAndOffset — the same
// column-splitting formula `bar` uses (barCategoryGap default "20%", barGap
// default "30%"). Before this fix every pictorialBar series drew its symbol
// centered on the raw category regardless of how many series shared it, so
// barGap had nothing to act on and multiple series' symbols fully overlapped.
describe("renderPictorialBar — barGap column offset (ECharts calBarWidthAndOffset)", () => {
  function render(series: PictorialBarSeriesOption[]) {
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement;
    // xCenter is fixed at 100 for every category, matching the bar-layout
    // test's fake scale; bandwidth 100 drives the barCategoryGap/barGap math.
    const xScale = { map: (_v: number) => 100, bandwidth: () => 100 };
    // *8 so a value of 10 produces an 80px bar height — as tall as the
    // barSize-derived symbol width, so the "scale symbol to bar height"
    // path (barH < symW would shrink r below symW/2) doesn't interfere with
    // what this test actually checks: the column's horizontal offset.
    const yScale = { map: (v: number) => 100 - v * 8 };
    renderPictorialBar(
      svg,
      series,
      [xScale] as any,
      [yScale] as any,
      new Set(),
    );
    return Array.from(svg.querySelectorAll("circle")).map((el) => ({
      cx: Number(el.getAttribute("cx")),
      r: Number(el.getAttribute("r")),
    }));
  }

  it("splits 2 series into their own columns instead of stacking both circles on the category center", () => {
    // usable = 100 * (1 - 0.2) = 80; barSize = 80 / (2 + 1*0.3) = 80 / 2.3;
    // gap = barSize * 0.3; pitch = barSize + gap; center = offsetFor(i) + barSize/2.
    const barSize = 80 / 2.3;
    const pitch = barSize * 1.3;
    const center0 = -40 + barSize / 2;
    const center1 = -40 + pitch + barSize / 2;

    const circles = render([
      { type: "pictorialBar", name: "a", data: [10] },
      { type: "pictorialBar", name: "b", data: [10] },
    ]);
    expect(circles).toHaveLength(2);
    expect(circles[0].cx).toBeCloseTo(100 + center0, 3);
    expect(circles[1].cx).toBeCloseTo(100 + center1, 3);
    // Neither column's symbol overlaps the other's center.
    expect(circles[0].cx).not.toBeCloseTo(circles[1].cx, 0);
    expect(circles[0].r).toBeCloseTo(barSize / 2, 3);
  });

  it("keeps a single series centered on the category, unchanged from before", () => {
    const circles = render([{ type: "pictorialBar", name: "a", data: [10] }]);
    expect(circles).toHaveLength(1);
    // barSize = 80 (single series, no gap divisor).
    expect(circles[0].cx).toBeCloseTo(100, 3);
    expect(circles[0].r).toBeCloseTo(40, 3);
  });

  it("still honours an explicit barGap ratio between the two columns", () => {
    // barGap "-100%" -> divisor = 2 + 1*(-1) = 1 -> barSize = usable = 80,
    // gap = -80 -> both columns land on the same offset (full overlap).
    const circles = render([
      { type: "pictorialBar", name: "a", data: [10], barGap: "-100%" },
      { type: "pictorialBar", name: "b", data: [10], barGap: "-100%" },
    ]);
    expect(circles[0].cx).toBeCloseTo(circles[1].cx, 6);
  });
});
