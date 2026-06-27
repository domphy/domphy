<script setup lang="ts">
import Dataset from "../demos/chart/Dataset.ts?raw"
</script>

---
title: "Dataset"
description: "Using dataset to share data between series and apply transforms in @domphy/chart."
---

# Dataset

The `dataset` component decouples data from series configuration. Multiple series can reference the same dataset, and transforms (filter, sort) can derive new datasets from existing ones.

## Basic usage

`dataset.source` accepts either a **2D array** (row-per-data) or an **object array**:

```ts
// Object array — column names come from object keys
const option: ChartOption = {
  dataset: {
    source: [
      { month: "Jan", revenue: 320, costs: 280 },
      { month: "Feb", revenue: 380, costs: 310 },
      { month: "Mar", revenue: 420, costs: 340 },
    ],
  },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  legend: {},
  series: [
    { type: "bar", name: "Revenue", encode: { x: "month", y: "revenue" } },
    { type: "bar", name: "Costs",   encode: { x: "month", y: "costs"   } },
  ],
};
```

`encode` maps dataset columns to chart axes. Both series above share the same `dataset` — no data duplication.

<CodeEditor :code="Dataset" storageKey="chart-dataset" />

## Column-index encoding

When `source` is a 2D array, the first row can be a **header row** of column names, or the array can be purely numeric. Either way, `encode` can reference columns by **string name** (if a header row is present) or by **column index**.

**With header row:**

```ts
const option: ChartOption = {
  dataset: {
    source: [
      ["product", "sales", "price"],
      ["A", 120, 45],
      ["B", 200, 62],
      ["C", 150, 38],
      ["D", 80,  29],
    ],
  },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  series: [
    { type: "bar",  name: "Sales", encode: { x: "product", y: "sales" } },
    { type: "line", name: "Price", encode: { x: "product", y: "price" } },
  ],
};
```

**By column index (no header row):**

```ts
const option: ChartOption = {
  dataset: {
    source: [
      [0, 120, 45],
      [1, 200, 62],
      [2, 150, 38],
    ],
  },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  series: [
    { type: "bar", encode: { x: 0, y: 1 } },
  ],
};
```

## Transforms

Add a `transform` to derive a new dataset from an existing one. Transforms are listed in the top-level `dataset` array, each referencing a source dataset by index.

### Filter

```ts
const option: ChartOption = {
  dataset: [
    {
      // index 0 — raw source
      source: [
        ["product", "sales", "price"],
        ["A", 120, 45],
        ["B", 80,  29],
        ["C", 200, 62],
        ["D", 60,  18],
        ["E", 150, 38],
      ],
    },
    {
      // index 1 — products with sales > 100
      fromDatasetIndex: 0,
      transform: {
        type: "filter",
        config: { dimension: "sales", gt: 100 },
      },
    },
  ],
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      name: "High-volume products",
      datasetIndex: 1,
      encode: { x: "product", y: "sales" },
    },
  ],
};
```

Filter `config` conditions:

| Key | Meaning |
|-----|---------|
| `gt`  | greater than |
| `gte` | greater than or equal |
| `lt`  | less than |
| `lte` | less than or equal |
| `eq`  | equal |
| `ne`  | not equal |

### Sort

```ts
dataset: [
  {
    source: [
      ["product", "sales", "price"],
      ["A", 120, 45],
      ["B", 80,  29],
      ["C", 200, 62],
    ],
  },
  {
    fromDatasetIndex: 0,
    transform: {
      type: "sort",
      config: { dimension: "sales", order: "desc" },
    },
  },
],
```

`order` is `"asc"` or `"desc"`.

### Chaining transforms

Chain multiple transforms by making each dataset reference the previous one:

```ts
dataset: [
  {
    // index 0 — raw data
    source: [
      ["product", "sales", "price"],
      ["A", 120, 45],
      ["B", 80,  29],
      ["C", 200, 62],
      ["D", 60,  18],
      ["E", 150, 38],
    ],
  },
  {
    // index 1 — filter: sales > 100
    fromDatasetIndex: 0,
    transform: { type: "filter", config: { dimension: "sales", gt: 100 } },
  },
  {
    // index 2 — sort filtered results by price descending
    fromDatasetIndex: 1,
    transform: { type: "sort", config: { dimension: "price", order: "desc" } },
  },
],
```

Series can then pick any dataset index:

```ts
series: [
  { type: "bar", name: "All",             datasetIndex: 0, encode: { x: "product", y: "sales" } },
  { type: "bar", name: "Filtered+sorted", datasetIndex: 2, encode: { x: "product", y: "sales" } },
],
```

## Multiple series from one dataset

Derived datasets let you show different views of the same data in separate series without duplicating the source:

```ts
const option: ChartOption = {
  dataset: [
    {
      source: [
        ["region", "q1", "q2", "q3", "q4"],
        ["North", 120, 140, 130, 160],
        ["South", 80,  110, 95,  130],
        ["East",  200, 180, 220, 210],
        ["West",  60,  75,  70,  90],
      ],
    },
    {
      // top regions: q1 >= 100
      fromDatasetIndex: 0,
      transform: { type: "filter", config: { dimension: "q1", gte: 100 } },
    },
    {
      // bottom regions: q1 < 100
      fromDatasetIndex: 0,
      transform: { type: "filter", config: { dimension: "q1", lt: 100 } },
    },
  ],
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  legend: {},
  series: [
    {
      type: "bar", name: "Top regions (Q1)",
      datasetIndex: 1,
      encode: { x: "region", y: "q1" },
    },
    {
      type: "bar", name: "Other regions (Q1)",
      datasetIndex: 2,
      encode: { x: "region", y: "q1" },
    },
  ],
};
```

## Using with chart() patch

Pass a `State<ChartOption>` to `chart()` for reactive dataset updates:

```ts
import { toState } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const source = toState([
  ["month", "revenue"],
  ["Jan", 320],
  ["Feb", 380],
  ["Mar", 420],
]);

const option = toState<ChartOption>({
  dataset: { source: source.v },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  series: [{ type: "bar", encode: { x: "month", y: "revenue" } }],
});

// Update data reactively — the chart re-renders automatically
source.v = [
  ["month", "revenue"],
  ["Apr", 390],
  ["May", 460],
  ["Jun", 510],
];
option.v = { ...option.v, dataset: { source: source.v } };

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};
```

When `option` is a `State<ChartOption>`, the `chart()` patch re-renders the chart on every state change. Assign a new `option.v` to trigger an update.
