import { describe, expect, it } from "vitest";
import { applyTransforms, resolveDataset } from "../src/index.ts";

describe("resolveDataset", () => {
  it("strips the header row from an array-of-arrays source", () => {
    const rows = resolveDataset({
      source: [
        ["name", "value"],
        ["A", 10],
        ["B", 20],
      ],
    });
    expect(rows).toEqual([
      { name: "A", value: 10 },
      { name: "B", value: 20 },
    ]);
  });

  it("keeps array rows verbatim when sourceHeader is false", () => {
    const rows = resolveDataset({
      source: [
        ["A", 10],
        ["B", 20],
      ],
      sourceHeader: false,
    });
    expect(rows).toEqual([
      ["A", 10],
      ["B", 20],
    ]);
  });

  it("passes an object-array source through unchanged", () => {
    const source = [
      { name: "A", value: 10 },
      { name: "B", value: 20 },
    ];
    expect(resolveDataset({ source })).toEqual(source);
  });

  it("pivots a column-object source ({ x: [...], y: [...] }) into rows", () => {
    const rows = resolveDataset({ source: { x: [1, 2, 3], y: [10, 20, 30] } });
    expect(rows).toEqual([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]);
  });

  it("applies declared transforms after resolving the source", () => {
    const rows = resolveDataset({
      source: [
        { name: "A", value: 10 },
        { name: "B", value: 20 },
      ],
      transform: [{ type: "filter", config: { dimension: "value", ">=": 15 } }],
    });
    expect(rows).toEqual([{ name: "B", value: 20 }]);
  });

  it("returns an empty array for an unrecognized source shape", () => {
    expect(resolveDataset({})).toEqual([]);
  });
});

describe("applyTransforms — filter", () => {
  const rows = [
    { name: "A", value: 10 },
    { name: "B", value: 20 },
    { name: "C", value: 30 },
  ];

  it("ANDs multiple comparison operators by default", () => {
    const result = applyTransforms(rows, [
      { type: "filter", config: { dimension: "value", ">": 10, "<=": 30 } },
    ]);
    expect(result).toEqual([
      { name: "B", value: 20 },
      { name: "C", value: 30 },
    ]);
  });

  it("ORs comparisons when method is OR", () => {
    const result = applyTransforms(rows, [
      {
        type: "filter",
        config: { dimension: "value", "=": 10, method: "OR", ">": 25 },
      },
    ]);
    expect(result).toEqual([
      { name: "A", value: 10 },
      { name: "C", value: 30 },
    ]);
  });

  it("supports range (inside) and outside checks", () => {
    expect(
      applyTransforms(rows, [
        { type: "filter", config: { dimension: "value", range: [15, 25] } },
      ]),
    ).toEqual([{ name: "B", value: 20 }]);
    expect(
      applyTransforms(rows, [
        { type: "filter", config: { dimension: "value", outside: [15, 25] } },
      ]),
    ).toEqual([
      { name: "A", value: 10 },
      { name: "C", value: 30 },
    ]);
  });

  it("indexes array rows by numeric dimension", () => {
    const arrayRows = [
      ["A", 10],
      ["B", 20],
    ];
    expect(
      applyTransforms(arrayRows, [
        { type: "filter", config: { dimension: 1, ">": 15 } },
      ]),
    ).toEqual([["B", 20]]);
  });

  it("passes rows through when no comparison operator is configured", () => {
    expect(
      applyTransforms(rows, [
        { type: "filter", config: { dimension: "value" } },
      ]),
    ).toEqual(rows);
  });
});

describe("applyTransforms — sort", () => {
  const rows = [
    { name: "B", value: 20 },
    { name: "A", value: 10 },
    { name: "C", value: 30 },
  ];

  it("sorts ascending by default", () => {
    const result = applyTransforms(rows, [
      { type: "sort", config: { dimension: "value" } },
    ]);
    expect(result.map((r) => (r as { name: string }).name)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("sorts descending when requested", () => {
    const result = applyTransforms(rows, [
      { type: "sort", config: { dimension: "value", order: "desc" } },
    ]);
    expect(result.map((r) => (r as { name: string }).name)).toEqual([
      "C",
      "B",
      "A",
    ]);
  });

  it("does not mutate the source array", () => {
    const original = [...rows];
    applyTransforms(rows, [{ type: "sort", config: { dimension: "value" } }]);
    expect(rows).toEqual(original);
  });

  it("parses date strings when parser is 'time'", () => {
    const dated = [
      { d: "2024-03-01" },
      { d: "2024-01-01" },
      { d: "2024-02-01" },
    ];
    const result = applyTransforms(dated, [
      { type: "sort", config: { dimension: "d", parser: "time" } },
    ]);
    expect(result.map((r) => (r as { d: string }).d)).toEqual([
      "2024-01-01",
      "2024-02-01",
      "2024-03-01",
    ]);
  });
});

describe("applyTransforms — chaining and unknown types", () => {
  it("runs multiple transforms in order", () => {
    const rows = [
      { name: "A", value: 10 },
      { name: "B", value: 30 },
      { name: "C", value: 20 },
    ];
    const result = applyTransforms(rows, [
      { type: "filter", config: { dimension: "value", ">": 10 } },
      { type: "sort", config: { dimension: "value" } },
    ]);
    expect(result.map((r) => (r as { name: string }).name)).toEqual(["C", "B"]);
  });

  it("passes rows through unchanged for an unrecognized transform type", () => {
    const rows = [{ name: "A", value: 10 }];
    expect(
      applyTransforms(rows, [{ type: "unknown-future-transform" }]),
    ).toEqual(rows);
  });
});
