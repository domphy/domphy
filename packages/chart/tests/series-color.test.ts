// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import { createColorResolver } from "../src/gl/color.ts";
import { GaugeRenderer } from "../src/gl/GaugeRenderer.ts";
import { LineRenderer } from "../src/gl/LineRenderer.ts";
import { PieRenderer } from "../src/gl/PieRenderer.ts";
import { RadarRenderer } from "../src/gl/RadarRenderer.ts";
import { ScatterRenderer } from "../src/gl/ScatterRenderer.ts";

// Regression: user-supplied CSS colors ("#hex", "rgb(…)") used to reach
// familyRgba(), which expected a ThemeFamily name and threw. Every renderer
// now resolves through ColorResolver.rgba(), which never throws and falls
// back to the series palette for unresolvable sources.
vi.mock("@luma.gl/engine", () => ({
  Model: class {
    props: Record<string, unknown> = {};
    setAttributes(_attrs: unknown) {}
    setVertexCount(_count: number) {}
    setInstanceCount(_count: number) {}
    draw(_renderPass: unknown) {}
  },
}));

const fakeDevice = {
  createBuffer: ({ data, id }: { data: Float32Array; id?: string }) => ({
    data,
    id,
    destroy: () => {},
  }),
} as any;

const fakeRenderPass = {} as any;
const identityScale = { map: (v: number) => v, bandwidth: () => 0 } as any;
const gridRect = { x: 0, y: 0, width: 100, height: 100 } as any;

function makeResolver(): ReturnType<typeof createColorResolver> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return createColorResolver(container);
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GL renderers accept concrete CSS series colors without throwing", () => {
  it("LineRenderer with color #ff8800 and rgb(10,20,30)", () => {
    const renderer = new LineRenderer(fakeDevice);
    const series = [
      { type: "line", data: [1, 2, 3], color: "#ff8800" },
      {
        type: "line",
        data: [3, 2, 1],
        color: "rgb(10,20,30)",
        areaStyle: { opacity: 0.3 },
      },
    ] as any;
    expect(() =>
      renderer.render(
        fakeRenderPass,
        series,
        [identityScale],
        [identityScale],
        gridRect,
        100,
        100,
        0,
        undefined,
        makeResolver(),
      ),
    ).not.toThrow();
  });

  it("ScatterRenderer with color #ff8800 and rgb(10,20,30)", () => {
    const renderer = new ScatterRenderer(fakeDevice);
    const series = [
      {
        type: "scatter",
        data: [
          [1, 2],
          [3, 4],
        ],
        color: "#ff8800",
      },
      {
        type: "scatter",
        data: [
          [2, 1],
          [4, 3],
        ],
        color: "rgb(10,20,30)",
      },
    ] as any;
    expect(() =>
      renderer.render(
        fakeRenderPass,
        series,
        [identityScale],
        [identityScale],
        gridRect,
        100,
        100,
        0,
        makeResolver(),
      ),
    ).not.toThrow();
  });

  it("RadarRenderer with color #ff8800 and rgb(10,20,30)", () => {
    const renderer = new RadarRenderer(fakeDevice);
    const radars = [
      {
        indicator: [
          { name: "A", max: 100 },
          { name: "B", max: 100 },
          { name: "C", max: 100 },
        ],
      },
    ] as any;
    const series = [
      { type: "radar", data: [{ value: [50, 70, 40] }], color: "#ff8800" },
      {
        type: "radar",
        data: [{ value: [30, 20, 60] }],
        color: "rgb(10,20,30)",
      },
    ] as any;
    expect(() =>
      renderer.render(
        fakeRenderPass,
        series,
        radars,
        100,
        100,
        0,
        makeResolver(),
      ),
    ).not.toThrow();
  });

  it("GaugeRenderer with color #ff8800 and rgb(10,20,30)", () => {
    const renderer = new GaugeRenderer();
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement;
    const series = [
      { type: "gauge", data: [{ value: 55, name: "A" }], color: "#ff8800" },
      {
        type: "gauge",
        data: [{ value: 30, name: "B" }],
        color: "rgb(10,20,30)",
      },
    ] as any;
    expect(() =>
      renderer.renderToSvg(svg, series, 200, 200, makeResolver()),
    ).not.toThrow();
  });

  it("PieRenderer with itemStyle color #ff8800 and rgb(10,20,30)", () => {
    const renderer = new PieRenderer(fakeDevice);
    const series = [
      {
        type: "pie",
        data: [
          { name: "A", value: 40, itemStyle: { color: "#ff8800" } },
          { name: "B", value: 60, itemStyle: { color: "rgb(10,20,30)" } },
        ],
      },
    ] as any;
    expect(() =>
      renderer.render(fakeRenderPass, series, 200, 200, 0, makeResolver()),
    ).not.toThrow();
  });
});

describe("ChartEngine.destroy() removes every layer it appended", () => {
  it("leaves the container with 0 element children (backsvg, canvas, overlaysvg)", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const engine = new ChartEngine(container);
    // Constructor appends backsvg + canvas + overlaysvg.
    expect(container.children.length).toBe(3);

    engine.destroy();
    expect(container.children.length).toBe(0);
  });

  it("setOption() after destroy() is a no-op (engine must not revive)", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const engine = new ChartEngine(container);
    engine.destroy();
    expect(() =>
      engine.setOption({ series: [{ type: "bar", data: [1, 2] }] }),
    ).not.toThrow();
    // The destroyed guard returns before option processing/warnings.
    expect(warn).not.toHaveBeenCalled();
    expect(container.children.length).toBe(0);
    warn.mockRestore();
  });
});
