// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ElementNode } from "@domphy/core";
import { ChartEngine } from "../src/engine.ts";
import { GaugeRenderer } from "../src/gl/GaugeRenderer.ts";
import { chart } from "../src/patch.ts";
import type { ChartOption } from "../src/types.ts";

function makeEngine(): { engine: ChartEngine; overlaysvg: SVGSVGElement } {
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
  return { engine, overlaysvg: (engine as any).overlaysvg as SVGSVGElement };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("ChartEngine series smoke (no real WebGL)", () => {
  const cases: Array<{ name: string; option: ChartOption }> = [
    {
      name: "line",
      option: {
        xAxis: { type: "category", data: ["A", "B", "C"] },
        yAxis: { type: "value" },
        series: [{ type: "line", data: [1, 2, 3] }],
      },
    },
    {
      name: "bar",
      option: {
        xAxis: { type: "category", data: ["A", "B", "C"] },
        yAxis: { type: "value" },
        series: [{ type: "bar", data: [10, 20, 15] }],
      },
    },
    {
      name: "pie",
      option: {
        series: [
          {
            type: "pie",
            data: [
              { name: "A", value: 40 },
              { name: "B", value: 60 },
            ],
          },
        ],
      },
    },
    {
      name: "scatter",
      option: {
        xAxis: { type: "value" },
        yAxis: { type: "value" },
        series: [{ type: "scatter", data: [[1, 2], [3, 4], [5, 1]] }],
      },
    },
    {
      name: "radar",
      option: {
        radar: {
          indicator: [
            { name: "A", max: 100 },
            { name: "B", max: 100 },
            { name: "C", max: 100 },
          ],
        },
        series: [{ type: "radar", data: [{ value: [50, 70, 40] }] }],
      },
    },
    {
      name: "heatmap",
      option: {
        xAxis: { type: "category", data: ["A", "B"] },
        yAxis: { type: "category", data: ["X", "Y"] },
        visualMap: { min: 0, max: 10 },
        series: [{ type: "heatmap", data: [[0, 0, 5], [1, 1, 8]] }],
      },
    },
    {
      name: "candlestick",
      option: {
        xAxis: { type: "category", data: ["D1", "D2"] },
        yAxis: { type: "value" },
        series: [
          {
            type: "candlestick",
            data: [
              [20, 30, 10, 35],
              [30, 25, 15, 40],
            ],
          },
        ],
      },
    },
    {
      name: "gauge",
      option: {
        series: [{ type: "gauge", data: [{ value: 55, name: "Score" }] }],
      },
    },
    // SVG-overlay layout series (no WebGL renderer required)
    {
      name: "funnel",
      option: {
        series: [
          {
            type: "funnel",
            data: [
              { name: "Visit", value: 100 },
              { name: "Buy", value: 40 },
            ],
          },
        ],
      },
    },
    {
      name: "treemap",
      option: {
        series: [
          {
            type: "treemap",
            data: [
              { name: "A", value: 10 },
              { name: "B", value: 20, children: [{ name: "B1", value: 12 }] },
            ],
          },
        ],
      },
    },
    {
      name: "sankey",
      option: {
        series: [
          {
            type: "sankey",
            data: [
              { name: "A" },
              { name: "B" },
              { name: "C" },
            ],
            links: [
              { source: "A", target: "B", value: 5 },
              { source: "B", target: "C", value: 3 },
            ],
          } as any,
        ],
      },
    },
  ];

  for (const { name, option } of cases) {
    it(`setOption(${name}) does not throw and keeps overlay SVG`, () => {
      const { engine, overlaysvg } = makeEngine();
      // Gauge draws via gaugeRenderer; attach a lightweight instance so the branch runs.
      if (name === "gauge") {
        (engine as any).gaugeRenderer = new GaugeRenderer(null);
      }
      expect(() => engine.setOption(option)).not.toThrow();
      expect(overlaysvg).toBeInstanceOf(SVGSVGElement);
      expect(overlaysvg.isConnected).toBe(true);
      engine.destroy();
    });
  }
});

describe("chart() patch", () => {
  it("exports chart and applies to a div via ElementNode without throw", async () => {
    if (!(globalThis as any).ResizeObserver) {
      (globalThis as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }

    // Avoid real WebGL in jsdom — init/setOption are stubbed on the prototype.
    vi.spyOn(ChartEngine.prototype, "init").mockResolvedValue(undefined);
    vi.spyOn(ChartEngine.prototype, "setOption").mockImplementation(() => {});
    vi.spyOn(ChartEngine.prototype, "setSize").mockImplementation(() => {});
    vi.spyOn(ChartEngine.prototype, "destroy").mockImplementation(() => {});

    const host = document.createElement("div");
    document.body.appendChild(host);

    const App = {
      div: null as null,
      style: { width: "400px", height: "300px", position: "relative" as const },
      $: [
        chart({
          xAxis: { type: "category", data: ["A", "B"] },
          yAxis: { type: "value" },
          series: [{ type: "bar", data: [1, 2] }],
        }),
      ],
    };

    expect(() => {
      const node = new ElementNode(App as any);
      node.render(host);
    }).not.toThrow();

    // Let the patch's init().then(applyOption) microtask run against mocks.
    await Promise.resolve();
    await Promise.resolve();

    expect(host.querySelector("div")).not.toBeNull();
  });
});
