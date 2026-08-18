// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyDatasetToSeries } from "../src/dataset/transform.ts";
import { ChartEngine } from "../src/engine.ts";
import type { ChartOption } from "../src/types.ts";

function makeEngine(width = 400, height = 300): {
  engine: ChartEngine;
  overlaysvg: SVGSVGElement;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const engine = new ChartEngine(container);
  (engine as any).device = {
    beginRenderPass: () => ({ end() {} }),
    submit() {},
  };
  engine.setSize(width, height);
  return { engine, overlaysvg: (engine as any).overlaysvg as SVGSVGElement };
}

describe("applyDatasetToSeries", () => {
  it("maps encode x/y onto series.data from a headered array source", () => {
    const series = applyDatasetToSeries(
      [
        { type: "bar", name: "Sales", encode: { x: "product", y: "sales" } },
        { type: "line", name: "Price", encode: { x: "product", y: "price" } },
      ] as any,
      {
        source: [
          ["product", "sales", "price"],
          ["A", 120, 45],
          ["B", 200, 62],
        ],
      },
    );
    expect(series[0].data).toEqual([
      ["A", 120],
      ["B", 200],
    ]);
    expect(series[1].data).toEqual([
      ["A", 45],
      ["B", 62],
    ]);
  });

  it("picks a dataset by datasetIndex and honors fromDatasetIndex transforms", () => {
    const series = applyDatasetToSeries(
      [
        {
          type: "bar",
          name: "High",
          datasetIndex: 1,
          encode: { x: "product", y: "sales" },
        },
      ] as any,
      [
        {
          source: [
            ["product", "sales"],
            ["A", 120],
            ["B", 80],
            ["C", 200],
          ],
        },
        {
          fromDatasetIndex: 0,
          transform: [
            { type: "filter", config: { dimension: "sales", ">": 100 } },
          ],
        },
      ],
    );
    expect(series[0].data).toEqual([
      ["A", 120],
      ["C", 200],
    ]);
  });

  it("encodes pie slices from itemName/value columns", () => {
    const series = applyDatasetToSeries(
      [
        {
          type: "pie",
          encode: { itemName: "name", value: "value" },
        },
      ] as any,
      {
        source: [
          { name: "Books", value: 30 },
          { name: "Games", value: 70 },
        ],
      },
    );
    expect(series[0].data).toEqual([
      { name: "Books", value: 30 },
      { name: "Games", value: 70 },
    ]);
  });

  it("leaves an explicit series.data array untouched", () => {
    const original = [
      { type: "bar", data: [1, 2, 3], encode: { x: 0, y: 1 } },
    ] as any;
    const series = applyDatasetToSeries(original, {
      source: [
        [0, 10],
        [1, 20],
      ],
    });
    expect(series[0].data).toEqual([1, 2, 3]);
  });
});

describe("ChartEngine dataset join", () => {
  it("fills category-axis labels and value extent from dataset + encode", () => {
    const { engine, overlaysvg } = makeEngine();
    const option: ChartOption = {
      dataset: {
        source: [
          ["product", "sales"],
          ["Matcha", 43],
          ["Milk", 83],
        ],
      },
      xAxis: { type: "category" },
      yAxis: { type: "value" },
      series: [{ type: "bar", encode: { x: "product", y: "sales" } }],
    };
    engine.setOption(option);

    const labels = [...overlaysvg.querySelectorAll(".dc-axes text")].map(
      (node) => node.textContent,
    );
    expect(labels).toContain("Matcha");
    expect(labels).toContain("Milk");

    const stored = (engine as any).option.series[0].data;
    expect(stored).toEqual([
      ["Matcha", 43],
      ["Milk", 83],
    ]);
    engine.destroy();
  });
});
