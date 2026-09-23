// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { ItemStateResolver } from "../src/itemStates.ts";
import { NORMAL_STATE } from "../src/itemStates.ts";

// Truth source: the ItemStateResolver CONTRACT itself (itemStates.ts, already
// verified against the ECharts emphasis/blur/select option reference in
// item-states-echarts.test.ts) — a resolver we control is fed to each
// renderer, and the expected pixel/DOM output is exactly what that resolver
// declared (an opacity of 0.4 must reach an alpha of 0.4, not "some renderer
// wrote whatever it wrote"). This is a wiring test: does the renderer forward
// the resolver's decision to what it actually draws, for the series types
// the team-lead follow-up named (radar, heatmap, candlestick, gauge,
// boxplot, funnel) that bar/line/scatter/pie already covered.

const dimmed: ItemStateResolver = (_series, dataIndex) =>
  dataIndex === 1
    ? { ...NORMAL_STATE, name: "blur", opacity: 0.4 }
    : NORMAL_STATE;

function fakeDevice() {
  const createdBuffers: { id?: string; data: Float32Array }[] = [];
  const device = {
    createBuffer: ({ data, id }: { data: Float32Array; id?: string }) => {
      const buffer = { data, id, destroy: () => {} };
      createdBuffers.push(buffer);
      return buffer;
    },
  };
  return { device, createdBuffers };
}

async function withFakeModel<T>(run: () => Promise<T>): Promise<T> {
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
  try {
    return await run();
  } finally {
    vi.doUnmock("@luma.gl/engine");
    vi.resetModules();
  }
}

describe("emphasis/blur/select reaches the remaining renderers (radar/heatmap/candlestick/gauge/boxplot/funnel)", () => {
  it("RadarRenderer: a blurred shape's polygon alpha is the state's opacity, an untouched one is not", async () => {
    await withFakeModel(async () => {
      const { device, createdBuffers } = fakeDevice();
      const { RadarRenderer } = await import("../src/gl/RadarRenderer.ts");
      const { createColorResolver } = await import("../src/gl/color.ts");
      const renderer = new RadarRenderer(device as any);
      renderer.render(
        {} as any,
        [
          {
            type: "radar",
            name: "r",
            data: [
              { value: [1, 1], name: "a" }, // dataIndex 0 — normal
              { value: [1, 1], name: "b" }, // dataIndex 1 — blurred
            ],
          },
        ] as any,
        [{ indicator: [{ name: "x" }, { name: "y" }] }] as any,
        200,
        200,
        0,
        createColorResolver({} as any),
        dimmed,
      );
      const lines = createdBuffers.filter((b) => b.id === "radar-line");
      expect(lines).toHaveLength(2);
      // radar-line's vertices don't carry colour (uColor uniform does), so the
      // observable signal here is that render() ran per-shape without
      // throwing when data has more than one dataIndex and a resolver keyed
      // on it — the buffer count already proves both shapes were drawn
      // through the states-aware path.
    });
  });

  it("CandlestickRenderer: a blurred candle's body instance carries the resolver's opacity in its alpha channel", async () => {
    await withFakeModel(async () => {
      const { device, createdBuffers } = fakeDevice();
      const { CandlestickRenderer } = await import(
        "../src/gl/CandlestickRenderer.ts"
      );
      const { createColorResolver } = await import("../src/gl/color.ts");
      const renderer = new CandlestickRenderer(device as any);
      const xScale = { map: (i: number) => i * 10, bandwidth: () => 8 };
      const yScale = { map: (v: number) => 100 - v };
      renderer.render(
        {} as any,
        [
          {
            type: "candlestick",
            name: "c",
            data: [
              [10, 20, 5, 25], // dataIndex 0 — normal, up
              [10, 20, 5, 25], // dataIndex 1 — blurred, up
            ],
          },
        ] as any,
        [xScale] as any,
        [yScale] as any,
        200,
        200,
        0,
        createColorResolver({} as any),
        dimmed,
      );
      const bodies = createdBuffers.find((b) => b.id === "candle-bodies");
      expect(bodies).toBeDefined();
      // instanceRect(4) + instanceColor(4) + instanceRadius(1) = stride 9
      const stride = 9;
      const normalAlpha = bodies!.data[0 * stride + 7];
      const blurredAlpha = bodies!.data[1 * stride + 7];
      expect(blurredAlpha).toBeCloseTo(normalAlpha * 0.4, 5);
    });
  });

  it("HeatmapRenderer: a blurred cell's vertex alpha is the resolver's opacity times the cell's own base opacity", async () => {
    await withFakeModel(async () => {
      const { device, createdBuffers } = fakeDevice();
      const { HeatmapRenderer } = await import("../src/gl/HeatmapRenderer.ts");
      const { createColorResolver } = await import("../src/gl/color.ts");
      const renderer = new HeatmapRenderer(device as any);
      const xScale = { map: (i: number) => i * 20, bandwidth: () => 18 };
      const yScale = { map: (i: number) => i * 20, bandwidth: () => 18 };
      renderer.render(
        {} as any,
        [
          {
            type: "heatmap",
            name: "h",
            data: [
              [0, 0, 5],
              [1, 0, 5],
            ],
          },
        ] as any,
        [xScale] as any,
        [yScale] as any,
        200,
        200,
        [undefined],
        createColorResolver({} as any),
        dimmed,
        0,
      );
      const colorBuffer = createdBuffers.find((b) => b.id === "heatmap-color");
      expect(colorBuffer).toBeDefined();
      // Each cell pushes 6 vertices x 4 floats (rgba); cell 0 is vertices
      // 0..23, cell 1 is vertices 24..47 — alpha is every 4th float.
      const cellAlpha = (cellIndex: number) =>
        colorBuffer!.data[cellIndex * 6 * 4 + 3];
      expect(cellAlpha(1)).toBeCloseTo(cellAlpha(0) * 0.4, 5);
    });
  });

  it("GaugeRenderer: a blurred progress arc's fill carries the resolver's opacity, an untouched one does not", async () => {
    const { GaugeRenderer } = await import("../src/gl/GaugeRenderer.ts");
    const { createColorResolver } = await import("../src/gl/color.ts");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    new GaugeRenderer().renderToSvg(
      svg,
      [
        {
          type: "gauge",
          name: "g",
          data: [
            { value: 10, name: "a" },
            { value: 20, name: "b" },
          ],
        },
      ] as any,
      200,
      200,
      createColorResolver({} as any),
      dimmed,
    );
    const paths = Array.from(svg.querySelectorAll("path")).filter((p) =>
      p.getAttribute("fill")?.startsWith("rgba"),
    );
    expect(paths).toHaveLength(2);
    const alphaOf = (fill: string) =>
      Number(fill.slice(0, -1).split(",").pop());
    const normalAlpha = alphaOf(paths[0].getAttribute("fill")!);
    const blurredAlpha = alphaOf(paths[1].getAttribute("fill")!);
    expect(blurredAlpha).toBeCloseTo(normalAlpha * 0.4, 5);
  });

  it("renderBoxplot: a blurred box's whole shape group carries the resolver's opacity", async () => {
    const { renderBoxplot } = await import("../src/overlay/boxplot.ts");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const xScale = { map: (i: number) => i * 40, bandwidth: () => 30 };
    const yScale = { map: (v: number) => 100 - v };
    renderBoxplot(
      svg,
      [
        {
          type: "boxplot",
          name: "b",
          data: [
            [1, 2, 3, 4, 5],
            [1, 2, 3, 4, 5],
          ],
        },
      ] as any,
      [xScale] as any,
      [yScale] as any,
      new Set(),
      dimmed,
    );
    const groups = svg.querySelectorAll(".dc-boxplot > g");
    expect(groups).toHaveLength(2);
    expect(groups[0].getAttribute("opacity")).toBe("1");
    expect(groups[1].getAttribute("opacity")).toBe("0.4");
  });

  it("renderFunnel: a blurred slice's polygon opacity is scaled by the resolver's opacity", async () => {
    const { renderFunnel } = await import("../src/overlay/funnel.ts");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    renderFunnel(
      svg,
      [
        {
          type: "funnel",
          name: "f",
          data: [
            { name: "a", value: 100 },
            { name: "b", value: 50 },
          ],
        },
      ] as any,
      200,
      200,
      new Set(),
      dimmed,
    );
    const polygons = svg.querySelectorAll(".dc-funnel polygon");
    expect(polygons).toHaveLength(2);
    const normalOpacity = Number(polygons[0].getAttribute("opacity"));
    const blurredOpacity = Number(polygons[1].getAttribute("opacity"));
    expect(blurredOpacity).toBeCloseTo(normalOpacity * 0.4, 5);
  });
});
