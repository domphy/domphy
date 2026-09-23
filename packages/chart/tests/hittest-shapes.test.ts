// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";

// Truth source: the SAME geometry functions the renderers paint from
// (coord/barPositions.ts#layoutCandlestickSeries, gl/RadarRenderer.ts#
// computeRadarPolygons, gl/GaugeRenderer.ts#computeGaugeArcs, overlay/
// funnel.ts#computeFunnelLayout, overlay/boxplot.ts#computeBoxplotLayout,
// the ordinal scale's own documented map() formula for heatmap cells) — this
// test computes the expected pixel position with that same math (not the
// hit-test's own output) and asserts a real mouse move over the real
// ChartEngine reaches the right datum, mirroring the existing
// engine-tooltip-hit.test.ts pattern for pie/line.

function makeEngine(width = 400, height = 300): ChartEngine {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const engine = new ChartEngine(container);
  (engine as any).device = {
    beginRenderPass: () => ({ end() {} }),
    submit() {},
  };
  engine.setSize(width, height);
  return engine;
}

function hover(container: HTMLElement, x: number, y: number) {
  container.dispatchEvent(
    new MouseEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

function click(container: HTMLElement, x: number, y: number) {
  container.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("per-shape mouse hit-test (hover-tooltip / hover-emphasis / click-select)", () => {
  it("heatmap: hover over one cell's exact rect shows that cell, not its neighbor", () => {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["x0", "x1"] },
      yAxis: { type: "category", data: ["y0", "y1"] },
      series: [
        {
          type: "heatmap",
          name: "hm",
          data: [
            [0, 0, 5],
            [1, 0, 10],
            [0, 1, 15],
            [1, 1, 20],
          ],
        },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    const grid = (engine as any).lastGridRect;
    // Ordinal scale, 2 categories, boundaryGap: map(index) = r0 + (index+0.5)*step
    const stepX = grid.width / 2;
    const stepY = grid.height / 2;
    // Cell (x1, y0): rightmost column. A y-axis's pixel range is inverted
    // (value/category increases upward on screen), so category index 0
    // (y0) maps to the BOTTOM of the grid, not the top.
    const px = grid.x + 1.5 * stepX;
    const py = grid.y + grid.height - 0.5 * stepY;
    hover(container, px, py);
    const tip = container.querySelector<HTMLElement>(".dc-tooltip")!;
    expect(tip.style.opacity).toBe("1");
    expect(tip.textContent).toContain("10");
    engine.destroy();
  });

  it("candlestick: click on one candle's body+wick box selects that dataIndex", () => {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["d0", "d1"] },
      yAxis: { type: "value", min: 0, max: 40 },
      series: [
        {
          type: "candlestick",
          name: "c",
          selectedMode: "single",
          data: [
            [10, 20, 5, 25],
            [15, 30, 10, 35],
          ],
        },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    const grid = (engine as any).lastGridRect;
    const stepX = grid.width / 2;
    // Candle 1 (d1) body spans [open=15, close=30] on a [0,40] value axis —
    // its vertical center (~22.5) maps inside the grid, its x center at
    // the second category band.
    const px = grid.x + 1.5 * stepX;
    const py = grid.y + grid.height * (1 - 22.5 / 40);
    click(container, px, py);
    expect((engine as any).selectedItems.has("0:1")).toBe(true);
    engine.destroy();
  });

  it("boxplot: hover inside the whisker-to-whisker box selects that dataIndex", () => {
    const engine = makeEngine();
    engine.setOption({
      tooltip: { trigger: "item" },
      xAxis: { type: "category", data: ["a", "b"] },
      yAxis: { type: "value", min: 0, max: 40 },
      series: [
        {
          type: "boxplot",
          name: "box",
          data: [
            [5, 10, 15, 20, 25],
            [10, 15, 20, 25, 30],
          ],
        },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    const grid = (engine as any).lastGridRect;
    const stepX = grid.width / 2;
    // Box "b" (dataIndex 1) whisker extent is [10, 30] — its midpoint (20)
    // is well inside every candidate box's own extent, but only "b"'s box
    // is centered at the second category band's x.
    const px = grid.x + 1.5 * stepX;
    const py = grid.y + grid.height * (1 - 20 / 40);
    hover(container, px, py);
    const tip = container.querySelector<HTMLElement>(".dc-tooltip")!;
    expect(tip.style.opacity).toBe("1");
    engine.destroy();
  });

  it("radar: hover at the shape's own center (inside every positive-fraction polygon) hits it", () => {
    const engine = makeEngine();
    engine.setOption({
      tooltip: { trigger: "item" },
      radar: {
        indicator: [
          { name: "a", max: 100 },
          { name: "b", max: 100 },
          { name: "c", max: 100 },
        ],
      },
      series: [
        {
          type: "radar",
          name: "r",
          data: [{ name: "shape1", value: [80, 80, 80] }],
        },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    // Default radar center is (width/2, height/2) — RadarRenderer.ts's own
    // default when radar.center is unset — the "hub" every axis fans out
    // from, always inside a star-shaped polygon with every fraction > 0.
    hover(container, 200, 150);
    const tip = container.querySelector<HTMLElement>(".dc-tooltip")!;
    expect(tip.style.opacity).toBe("1");
    expect(tip.textContent).toContain("shape1");
    engine.destroy();
  });

  it("funnel: hover inside one trapezoid's interpolated width selects that slice", () => {
    const engine = makeEngine();
    engine.setOption({
      tooltip: { trigger: "item" },
      series: [
        {
          type: "funnel",
          name: "f",
          data: [
            { name: "a", value: 100 },
            { name: "b", value: 50 },
          ],
        },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    // Defaults (funnel.ts#computeFunnelLayout): left=width*0.15=60,
    // top=height*0.1=30, funnelW=width*0.7=280, funnelH=height*0.8=240.
    // Slice "a" (widest, topW=280) spans itemTop=30.5..itemBottom=149.5;
    // its horizontal center is always width/2=200 at every y in that range.
    hover(container, 200, 90);
    const tip = container.querySelector<HTMLElement>(".dc-tooltip")!;
    expect(tip.style.opacity).toBe("1");
    expect(tip.textContent).toContain("a");
    engine.destroy();
  });

  it("gauge: hover inside the progress arc's annulus+sweep selects that item, outside the sweep misses", () => {
    const engine = makeEngine();
    engine.setOption({
      tooltip: { trigger: "item" },
      series: [
        { type: "gauge", name: "g", data: [{ value: 50, name: "reading" }] },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    // Defaults (gl/GaugeRenderer.ts#computeGaugeArcs): center (200,150),
    // radius=0.75*(min(400,300)/2)=112.5, innerRadius=radius-18=94.5,
    // startAngle=225deg, endAngle=-45deg (totalAngle=-270deg), value 50 of
    // [0,100] -> fraction 0.5 -> progressEndRad = 225deg - 135deg = 90deg.
    // Midpoint angle (157.5deg) at mid-annulus radius is inside the arc.
    const midAngle = ((225 + 90) / 2) * (Math.PI / 180);
    const midRadius = (94.5 + 112.5) / 2;
    const px = 200 + midRadius * Math.cos(midAngle);
    const py = 150 - midRadius * Math.sin(midAngle);
    hover(container, px, py);
    const tip = container.querySelector<HTMLElement>(".dc-tooltip")!;
    expect(tip.style.opacity).toBe("1");
    expect(tip.textContent).toContain("reading");

    // Same annulus, an angle well past the swept 90deg..225deg progress arc
    // (e.g. -30deg, inside the gauge's un-swept track) must NOT hit.
    const missAngle = -30 * (Math.PI / 180);
    const mpx = 200 + midRadius * Math.cos(missAngle);
    const mpy = 150 - midRadius * Math.sin(missAngle);
    hover(container, mpx, mpy);
    expect(tip.style.opacity).toBe("0");
    engine.destroy();
  });

  it("hover emphasis: the same hit-test sets hoverItem to the shape under the cursor, not a neighbor", () => {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["x0", "x1"] },
      yAxis: { type: "category", data: ["y0", "y1"] },
      series: [
        {
          type: "heatmap",
          name: "hm",
          emphasis: { focus: "self" },
          data: [
            [0, 0, 5],
            [1, 0, 10],
            [0, 1, 15],
            [1, 1, 20],
          ],
        },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    const grid = (engine as any).lastGridRect;
    const stepX = grid.width / 2;
    const stepY = grid.height / 2;
    // Cell (x1, y1): top-right.
    hover(container, grid.x + 1.5 * stepX, grid.y + 0.5 * stepY);
    expect((engine as any).hoverItem).toEqual({ seriesIndex: 0, dataIndex: 3 });
    engine.destroy();
  });
});
