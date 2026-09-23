// @vitest-environment jsdom

import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import { GaugeRenderer } from "../src/gl/GaugeRenderer.ts";
import { chart } from "../src/patch.ts";
import type { ChartOption } from "../src/types.ts";

function makeEngine(): {
  engine: ChartEngine;
  overlaysvg: SVGSVGElement;
  container: HTMLElement;
} {
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
  return {
    engine,
    overlaysvg: (engine as any).overlaysvg as SVGSVGElement,
    container,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("ChartEngine unsupported surface warnings", () => {
  // Regression: `custom` gained a real renderer (src/overlay/custom.ts) but
  // was never added to engine.ts's IMPLEMENTED_SERIES_TYPES, so every
  // `type: "custom"` series still logged the generic "not implemented"
  // warning even though it rendered — a lie in the opposite direction from
  // the one this warning exists to catch. Caught by this exact pre-existing
  // test (written when custom truly was unimplemented) failing once
  // custom.ts landed.
  it("does NOT warn for series type custom (implemented — see src/overlay/custom.ts) and renders it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { engine, overlaysvg } = makeEngine();
    engine.setOption({
      xAxis: { type: "value" },
      yAxis: { type: "value" },
      series: [
        {
          type: "custom",
          data: [[1, 1]],
          renderItem: () => ({ type: "circle", shape: { cx: 0, cy: 0, r: 5 } }),
        } as any,
      ],
    });
    expect(
      warn.mock.calls.some((c) =>
        String(c[0]).includes('series type "custom"'),
      ),
    ).toBe(false);
    expect(overlaysvg.querySelector(".dc-custom circle")).not.toBeNull();
    warn.mockRestore();
  });

  it("warns for a custom series' unsupported 'polygon' brush type, not for 'rect'/'lineX'/'lineY'", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { engine } = makeEngine();
    engine.setOption({
      brush: { brushType: "rect" },
      series: [{ type: "bar", data: [1, 2] }],
    });
    expect(warn.mock.calls.some((c) => String(c[0]).includes("brush"))).toBe(
      false,
    );
    engine.setOption({
      brush: { brushType: "polygon" } as any,
      series: [{ type: "bar", data: [1, 2] }],
    });
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes("'polygon'")),
    ).toBe(true);
    warn.mockRestore();
  });

  // WAI-ARIA: a group of related controls is exposed as role="toolbar".
  it("mounts an accessible toolbar for option.toolbox instead of warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { engine, container } = makeEngine();
    engine.setOption({
      toolbox: { feature: { restore: {}, saveAsImage: {} } },
      series: [{ type: "bar", data: [1, 2] }],
    });
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.querySelectorAll("button").length).toBe(2);
    expect(warn.mock.calls.some((c) => String(c[0]).includes("toolbox"))).toBe(
      false,
    );
    warn.mockRestore();
  });
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
        series: [
          {
            type: "scatter",
            data: [
              [1, 2],
              [3, 4],
              [5, 1],
            ],
          },
        ],
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
        series: [
          {
            type: "heatmap",
            data: [
              [0, 0, 5],
              [1, 1, 8],
            ],
          },
        ],
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
            data: [{ name: "A" }, { name: "B" }, { name: "C" }],
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
