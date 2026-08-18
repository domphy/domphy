// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import type { ChartOption } from "../src/types.ts";

// render() needs a device — a minimal fake is enough: WebGL renderers stay
// null (guarded with ?.) and the render pass is a no-op, so the SVG overlay
// and interaction wiring under test run for real.
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

function mouseEvent(type: string, clientX: number): MouseEvent {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
}

describe("dataZoom slider survives re-renders", () => {
  // Regression: render() used to tear down and re-create the slider from the
  // option's initial start/end on every render. A drag's first mousemove
  // re-renders via onZoom, which (a) removed the slider's document-level
  // mousemove/mouseup listeners mid-drag, killing the drag after one step,
  // and (b) snapped the thumbs back to the option's initial range.
  it("keeps the same slider DOM across drag re-renders and tracks the live zoom window", () => {
    const engine = makeEngine();
    const option: ChartOption = {
      xAxis: {
        type: "category",
        data: Array.from({ length: 20 }, (_, i) => `c${i}`),
      },
      yAxis: { type: "value" },
      series: [
        { type: "line", name: "s1", data: Array.from({ length: 20 }, () => 1) },
      ],
      dataZoom: [{ type: "slider", start: 0, end: 50 } as any],
    };
    engine.setOption(option);

    const groupBefore = document.querySelector(".dc-datazoom");
    expect(groupBefore).not.toBeNull();
    const fill = () =>
      document.querySelectorAll<SVGRectElement>(".dc-datazoom rect")[1];

    // gridRect.x = 60, width = 320 (container 400 minus default left/right).
    // start=0 → left handle at x=60; grab it and drag right by 32px (10%).
    (groupBefore as Element).dispatchEvent(mouseEvent("mousedown", 60));
    document.dispatchEvent(mouseEvent("mousemove", 92));

    // The drag re-rendered — the slider group must NOT have been replaced.
    const groupAfter = document.querySelector(".dc-datazoom");
    expect(groupAfter).toBe(groupBefore);
    // Thumb moved to start=10 → fill x = 60 + 0.10 * 320 = 92.
    expect(Number(fill().getAttribute("x"))).toBeCloseTo(92, 0);

    // The drag is still alive after the re-render: a second mousemove moves
    // the thumb again (start=20 → fill x = 124).
    document.dispatchEvent(mouseEvent("mousemove", 124));
    expect(Number(fill().getAttribute("x"))).toBeCloseTo(124, 0);

    document.dispatchEvent(mouseEvent("mouseup", 124));
    // And the live zoom window (not the option's initial 0–50) is what the
    // scale sees: the engine's xZoomMap reflects the dragged range.
    expect((engine as any).xZoomMap.get(0)).toEqual({ start: 20, end: 50 });

    engine.destroy();
  });

  it("re-creates the slider when the canvas size changes", () => {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["a", "b", "c"] },
      yAxis: { type: "value" },
      series: [{ type: "line", name: "s1", data: [1, 2, 3] }],
      dataZoom: [{ type: "slider", start: 10, end: 90 } as any],
    });
    const groupBefore = document.querySelector(".dc-datazoom");

    engine.setSize(800, 600);
    engine.render();

    const groupAfter = document.querySelector(".dc-datazoom");
    expect(groupAfter).not.toBeNull();
    expect(groupAfter).not.toBe(groupBefore);

    engine.destroy();
  });
});

describe("legend.selected seeds hidden series", () => {
  // ECharts semantics: legend.selected maps a series name to false to start
  // it hidden. Previously ignored entirely — the series rendered anyway.
  it("hides series whose legend.selected entry is false on setOption", () => {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["a", "b"] },
      yAxis: { type: "value" },
      legend: { selected: { s2: false } },
      series: [
        { type: "line", name: "s1", data: [1, 2] },
        { type: "line", name: "s2", data: [3, 4] },
      ],
    });

    expect((engine as any).hiddenSeries.has("s2")).toBe(true);
    expect((engine as any).hiddenSeries.has("s1")).toBe(false);
    // The legend still renders both names, with s2 in the disabled state.
    const texts = [...document.querySelectorAll(".dc-legend text")].map((t) =>
      t.getAttribute("opacity"),
    );
    expect(texts).toEqual(["1", "0.5"]);

    engine.destroy();
  });
});

describe("legend fidelity: selectedMode and formatter", () => {
  function legendChart(legend: Record<string, unknown>): ChartEngine {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["a", "b"] },
      yAxis: { type: "value" },
      legend,
      series: [
        { type: "line", name: "s1", data: [1, 2] },
        { type: "line", name: "s2", data: [3, 4] },
        { type: "line", name: "s3", data: [5, 6] },
      ],
    });
    return engine;
  }

  function clickLegend(name: string) {
    const texts = [...document.querySelectorAll(".dc-legend text")];
    const index = texts.findIndex((t) => t.textContent === name);
    const hitAreas = document.querySelectorAll(".dc-legend rect");
    // Each item appends its hit-area rect then its swatch rect, so hit areas
    // sit at even indices.
    (hitAreas[index * 2] as SVGRectElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  }

  it("selectedMode: false disables toggling", () => {
    const engine = legendChart({ selectedMode: false });
    clickLegend("s1");
    expect((engine as any).hiddenSeries.size).toBe(0);
    engine.destroy();
  });

  it('selectedMode: "single" keeps exactly one series visible', () => {
    const engine = legendChart({ selectedMode: "single" });
    clickLegend("s2");
    expect([...(engine as any).hiddenSeries].sort()).toEqual(["s1", "s3"]);
    // Clicking the sole visible series hides all (ECharts single semantics).
    clickLegend("s2");
    expect([...(engine as any).hiddenSeries].sort()).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
    engine.destroy();
  });

  it("legend.formatter renames labels ({name} template and function)", () => {
    const engine = legendChart({ formatter: "{name}*" });
    const labels = [...document.querySelectorAll(".dc-legend text")].map(
      (t) => t.textContent,
    );
    expect(labels).toEqual(["s1*", "s2*", "s3*"]);
    engine.destroy();

    const engine2 = legendChart({ formatter: (n: string) => n.toUpperCase() });
    const labels2 = [...document.querySelectorAll(".dc-legend text")].map(
      (t) => t.textContent,
    );
    expect(labels2).toEqual(["S1", "S2", "S3"]);
    engine2.destroy();
  });
});

describe('legend.selectedMode "single" reconciles the initial state', () => {
  // ECharts single-mode also constrains the INITIAL selected map: at most one
  // series may start visible — the first one in series order wins, the rest
  // start hidden. Previously honored only on click.
  function singleChart(legend: Record<string, unknown>): ChartEngine {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["a", "b"] },
      yAxis: { type: "value" },
      legend,
      series: [
        { type: "line", name: "s1", data: [1, 2] },
        { type: "line", name: "s2", data: [3, 4] },
        { type: "line", name: "s3", data: [5, 6] },
      ],
    });
    return engine;
  }

  it("keeps only the first selected series visible when several start true", () => {
    const engine = singleChart({
      selectedMode: "single",
      selected: { s1: true, s2: true, s3: false },
    });
    expect([...(engine as any).hiddenSeries].sort()).toEqual(["s2", "s3"]);
    engine.destroy();
  });

  it("reconciles the default all-visible state down to the first series", () => {
    const engine = singleChart({ selectedMode: "single" });
    expect([...(engine as any).hiddenSeries].sort()).toEqual(["s2", "s3"]);
    engine.destroy();
  });

  it("respects an explicit false on the first series (next visible wins)", () => {
    const engine = singleChart({
      selectedMode: "single",
      selected: { s1: false, s2: true, s3: true },
    });
    expect([...(engine as any).hiddenSeries].sort()).toEqual(["s1", "s3"]);
    engine.destroy();
  });
});

describe("pie hit-test ignores legend-hidden slices", () => {
  // Regression: hitTestPie walked s.data directly, so hovering a slice whose
  // name was legend-hidden still fired an item tooltip.
  it("does not fire a tooltip for a legend-hidden slice, but still fires for visible ones", () => {
    const engine = makeEngine(400, 300);
    engine.setOption({
      tooltip: { trigger: "item" },
      legend: { selected: { Books: false } },
      series: [
        {
          type: "pie",
          name: "Sales",
          data: [
            { name: "Books", value: 1 },
            { name: "Games", value: 1 },
          ],
        },
      ],
    });

    const tooltipEl = () => document.querySelector<HTMLElement>(".dc-tooltip")!;
    // The mousemove listener is bound to the engine container. jsdom's
    // getBoundingClientRect is all zeros, so client coords equal
    // container-relative coords. Pie center is (200, 150); slices start at
    // -90°, so "Books" covers the right half (angle 0) and "Games" the left
    // half (angle 180°).
    const container = tooltipEl().parentElement!;
    const hoverIn = (x: number, y: number) =>
      container.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        }),
      );

    // Hidden "Books" is removed from the pie (remaining slices rescale), so
    // hovering the old Books half must not name Books — Games owns the ring.
    hoverIn(250, 150);
    expect(tooltipEl().style.opacity).toBe("1");
    expect(tooltipEl().textContent).toContain("Games");
    expect(tooltipEl().textContent).not.toContain("Books");

    hoverIn(150, 150);
    expect(tooltipEl().style.opacity).toBe("1");
    expect(tooltipEl().textContent).toContain("Games");

    engine.destroy();
  });
});

describe("tooltip trigger defaults and item hit-tests", () => {
  function tooltipEl(): HTMLElement {
    return document.querySelector<HTMLElement>(".dc-tooltip")!;
  }

  function hover(container: HTMLElement, x: number, y: number) {
    container.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      }),
    );
  }

  it("defaults a pie-only chart to item trigger so a slice fires without trigger: item", () => {
    const engine = makeEngine(400, 300);
    engine.setOption({
      series: [
        {
          type: "pie",
          name: "Sales",
          data: [
            { name: "Books", value: 1 },
            { name: "Games", value: 1 },
          ],
        },
      ],
    });
    const container = tooltipEl().parentElement!;
    // Right half of the default pie (starts at 12 o'clock, clockwise) is Books.
    hover(container, 250, 150);
    expect(tooltipEl().style.opacity).toBe("1");
    expect(tooltipEl().textContent).toContain("Books");
    engine.destroy();
  });

  it("hit-tests line points when tooltip.trigger is item", () => {
    const engine = makeEngine(400, 300);
    engine.setOption({
      tooltip: { trigger: "item" },
      xAxis: { type: "value", min: 0, max: 100 },
      yAxis: { type: "value", min: 0, max: 100 },
      series: [{ type: "line", name: "Trend", data: [[50, 50]] }],
    });
    const container = tooltipEl().parentElement!;
    // grid: x 60–380 (width 320), y 40–250 (height 210, flipped).
    // 50/100 → x=220, y=145.
    hover(container, 220, 145);
    expect(tooltipEl().style.opacity).toBe("1");
    expect(tooltipEl().textContent).toContain("Trend");
    engine.destroy();
  });

  it("hit-tests a bar when tooltip.trigger is item", () => {
    const engine = makeEngine(400, 300);
    engine.setOption({
      tooltip: { trigger: "item" },
      xAxis: { type: "category", data: ["A", "B"] },
      yAxis: { type: "value", min: 0, max: 20 },
      series: [{ type: "bar", name: "Sales", data: [10, 20] }],
    });
    const container = tooltipEl().parentElement!;
    // Category A band center: 60 + 320/4 = 140. Value 10 is halfway down
    // the 0–20 axis → y = 40 + 210/2 = 145.
    hover(container, 140, 145);
    expect(tooltipEl().style.opacity).toBe("1");
    expect(tooltipEl().textContent).toContain("Sales");
    engine.destroy();
  });
});

describe("ChartEngine wipes stale overlay groups", () => {
  it("removes title, legend, axes and marks when the next option leaves them empty", () => {
    const engine = makeEngine();
    engine.setOption({
      title: { text: "Hello" },
      legend: {},
      xAxis: { type: "category", data: ["a", "b"] },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          name: "s1",
          data: [1, 2],
          markPoint: { data: [{ type: "max" }] } as any,
        },
      ],
    });
    const overlaysvg = (engine as any).overlaysvg as SVGSVGElement;
    const backsvg = (engine as any).backsvg as SVGSVGElement;
    expect(overlaysvg.querySelector(".dc-title")).not.toBeNull();
    expect(overlaysvg.querySelector(".dc-legend")).not.toBeNull();
    expect(overlaysvg.querySelector(".dc-axes")).not.toBeNull();
    expect(backsvg.querySelector(".dc-axes-grid")).not.toBeNull();
    expect(overlaysvg.querySelector(".dc-marks")).not.toBeNull();

    engine.setOption({
      series: [
        {
          type: "pie",
          data: [
            { name: "A", value: 1 },
            { name: "B", value: 1 },
          ],
        },
      ],
    });
    expect(overlaysvg.querySelector(".dc-title")).toBeNull();
    expect(overlaysvg.querySelector(".dc-legend")).toBeNull();
    expect(overlaysvg.querySelector(".dc-axes")).toBeNull();
    expect(backsvg.querySelector(".dc-axes-grid")).toBeNull();
    expect(overlaysvg.querySelector(".dc-marks")).toBeNull();
    engine.destroy();
  });
});

describe("hiddenSeries survives setOption when the series name set is unchanged", () => {
  function clickLegend(name: string) {
    const texts = [...document.querySelectorAll(".dc-legend text")];
    const index = texts.findIndex((node) => node.textContent === name);
    const hitAreas = document.querySelectorAll(".dc-legend rect");
    (hitAreas[index * 2] as SVGRectElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  }

  it("keeps a user toggle across a data-only setOption", () => {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["a", "b"] },
      yAxis: { type: "value" },
      legend: {},
      series: [
        { type: "line", name: "s1", data: [1, 2] },
        { type: "line", name: "s2", data: [3, 4] },
      ],
    });
    clickLegend("s1");
    expect((engine as any).hiddenSeries.has("s1")).toBe(true);

    engine.setOption({
      xAxis: { type: "category", data: ["a", "b"] },
      yAxis: { type: "value" },
      legend: {},
      series: [
        { type: "line", name: "s1", data: [9, 8] },
        { type: "line", name: "s2", data: [7, 6] },
      ],
    });
    expect((engine as any).hiddenSeries.has("s1")).toBe(true);
    engine.destroy();
  });

  it("resets toggles when the series name set actually changes", () => {
    const engine = makeEngine();
    engine.setOption({
      xAxis: { type: "category", data: ["a"] },
      yAxis: { type: "value" },
      legend: {},
      series: [
        { type: "line", name: "s1", data: [1] },
        { type: "line", name: "s2", data: [2] },
      ],
    });
    clickLegend("s1");
    expect((engine as any).hiddenSeries.has("s1")).toBe(true);

    engine.setOption({
      xAxis: { type: "category", data: ["a"] },
      yAxis: { type: "value" },
      legend: {},
      series: [
        { type: "line", name: "s1", data: [1] },
        { type: "line", name: "s3", data: [3] },
      ],
    });
    expect((engine as any).hiddenSeries.has("s1")).toBe(false);
    engine.destroy();
  });
});

describe("resolvePolar is invoked when option.polar is present", () => {
  it("stores polar coords computed from the polar option", () => {
    const engine = makeEngine(400, 300);
    engine.setOption({
      polar: {},
      angleAxis: { type: "value" },
      radiusAxis: { type: "value" },
      series: [{ type: "bar", coordinateSystem: "polar", data: [1, 2, 3] } as any],
    });
    const coords = (engine as any).polarCoords;
    expect(coords).toHaveLength(1);
    expect(coords[0].center).toEqual([200, 150]);
    expect(coords[0].outerRadius).toBeGreaterThan(0);
    engine.destroy();
  });
});

describe("series as a single object (ECharts interop)", () => {
  // ECharts accepts `series: {…}` (non-array). Previously every render path
  // treated it as an array and crashed on .filter — normalize once up front.
  it("normalizes a single series object instead of throwing", () => {
    const engine = makeEngine();
    expect(() =>
      engine.setOption({
        xAxis: { type: "category", data: ["a", "b"] },
        yAxis: { type: "value" },
        series: { type: "line", name: "solo", data: [1, 2] } as any,
      }),
    ).not.toThrow();
    expect((engine as any).option.series).toEqual([
      { type: "line", name: "solo", data: [1, 2] },
    ]);
    engine.destroy();
  });
});
