---
title: "Marks"
description: "markPoint, markLine, and markArea annotations in @domphy/chart — highlight min/max/average or custom coordinates on any series."
---

# Marks

Marks are annotations attached directly to a series. They overlay the chart without being part of the series data itself.

All three mark types are fields on any series object:

```ts
series: [{
  type: "line",
  data: [...],
  markPoint: { data: [...] },
  markLine: { data: [...] },
  markArea: { data: [...] },
}]
```

---

## markPoint

Renders a pin dot with a label at a specific data point.

```ts
interface MarkPointData {
  type?: "max" | "min" | "average",
  name?: string,
  coord?: [number | string, number],  // [xValue, yValue]
  symbol?: string,
  symbolSize?: number,
}

markPoint: {
  data: MarkPointData[],
}
```

**`type`-based points** — the chart resolves the position automatically from series data:

- `"max"` — finds the data point with the highest y-value
- `"min"` — finds the data point with the lowest y-value
- `"average"` — computes the mean y-value; placed at the midpoint x position

**`coord`-based points** — pin at an explicit `[x, y]` coordinate. For category axes, `x` is the category string or its index.

**Example — max, min, and a custom coordinate:**

```ts
{
  type: "line",
  data: [820, 932, 901, 934, 1290, 1330, 1320],
  markPoint: {
    data: [
      { type: "max", name: "Peak" },
      { type: "min", name: "Trough" },
      { name: "Target", coord: [3, 1000], symbolSize: 30 },
    ],
  },
}
```

**Custom symbol:**

```ts
markPoint: {
  data: [
    { type: "max", symbol: "pin", symbolSize: 40 },
    { type: "min", symbol: "circle", symbolSize: 20 },
  ],
}
```

---

## markLine

Renders a horizontal or vertical reference line across the chart area.

```ts
interface MarkLineData {
  type?: "max" | "min" | "average",
  xAxis?: number | string,
  yAxis?: number | string,
  name?: string,
}

markLine: {
  data: MarkLineData[],
}
```

- `type: "max"` — horizontal line at the series maximum
- `type: "min"` — horizontal line at the series minimum
- `type: "average"` — horizontal dashed line at the series mean
- `yAxis` — horizontal line at a specific y-value
- `xAxis` — vertical line at a specific x-value (category string or index)

All mark lines render as dashed lines.

**Example — average line and a fixed threshold:**

```ts
{
  type: "bar",
  data: [120, 200, 150, 80, 70, 110, 130],
  markLine: {
    data: [
      { type: "average", name: "Avg" },
      { yAxis: 100, name: "Threshold" },
    ],
  },
}
```

**Vertical line at a category:**

```ts
{
  type: "line",
  data: [820, 932, 901, 934, 1290, 1330, 1320],
  markLine: {
    data: [
      { xAxis: 4, name: "Inflection" },
    ],
  },
}
```

---

## markArea

Renders a shaded rectangle between two boundary points.

```ts
type MarkAreaPoint = {
  xAxis?: number | string,
  yAxis?: number | string,
}

markArea: {
  data: [[MarkAreaPoint, MarkAreaPoint], ...],
}
```

Each entry is a pair `[startPoint, endPoint]`. Use `xAxis` to shade a range of x-values, or `yAxis` to shade a horizontal band.

**Example — shade a range of categories:**

```ts
{
  type: "line",
  data: [820, 932, 901, 934, 1290, 1330, 1320],
  markArea: {
    data: [
      [{ xAxis: 1 }, { xAxis: 3 }],
    ],
  },
}
```

**Horizontal band between two y-values:**

```ts
markArea: {
  data: [
    [{ yAxis: 800 }, { yAxis: 1000 }],
  ],
}
```

**Multiple shaded regions:**

```ts
markArea: {
  data: [
    [{ xAxis: 0 }, { xAxis: 2 }],
    [{ xAxis: 5 }, { xAxis: 6 }],
  ],
}
```

---

## Combining marks

All three mark types can coexist on the same series.

```ts
{
  type: "line",
  name: "Revenue",
  data: [820, 932, 901, 934, 1290, 1330, 1320],
  markPoint: {
    data: [
      { type: "max", name: "Max" },
      { type: "min", name: "Min" },
    ],
  },
  markLine: {
    data: [
      { type: "average", name: "Avg" },
      { yAxis: 1000, name: "Target" },
    ],
  },
  markArea: {
    data: [
      [{ xAxis: 4 }, { xAxis: 6 }],
    ],
  },
}
```
