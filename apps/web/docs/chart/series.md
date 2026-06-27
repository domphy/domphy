---
title: "Series Reference"
description: "All @domphy/chart series types — line, bar, scatter, pie, radar, heatmap, candlestick, gauge, boxplot, funnel, treemap, sankey, graph."
---

# Series Reference

## Line

```ts
{
  type: "line",
  name?: string,
  data: number[] | [number, number][],
  smooth?: boolean,                  // bezier smoothing
  step?: "start" | "end" | "middle", // step line
  connectNulls?: boolean,
  stack?: string,                    // stack group name
  symbol?: "circle" | "rect" | "diamond" | "triangle" | "none",
  symbolSize?: number | [number, number],
  lineStyle?: { color?: ThemeFamily, width?: number, type?: "solid" | "dashed" | "dotted" },
  areaStyle?: {
    color?: ThemeFamily | GradientObject,
    opacity?: number,                // default 0.2
    origin?: "auto" | "start" | "end" | number,
  },
  label?: LabelOption,
  color?: ThemeFamily,
}
```

**Gradient area fill:**
```ts
{
  type: "line",
  data: [820, 932, 901, 934, 1290],
  areaStyle: {
    color: {
      type: "linear", x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(58,77,233,0.8)" },
        { offset: 1, color: "rgba(58,77,233,0.05)" },
      ],
    },
  },
}
```

---

## Bar

```ts
{
  type: "bar",
  name?: string,
  data: number[],
  stack?: string,
  barWidth?: number | string,        // px or "%"
  barMaxWidth?: number | string,
  barGap?: string,                   // gap between bars in same category (default "30%")
  barCategoryGap?: string,           // gap between category groups (default "20%")
  label?: LabelOption,
  itemStyle?: ItemStyleOption,
  color?: ThemeFamily,
}
```

**Grouped bars** — two series on same axis:
```ts
series: [
  { type: "bar", name: "2023", data: [120, 200, 150] },
  { type: "bar", name: "2024", data: [150, 230, 180] },
]
```

**Stacked bars:**
```ts
series: [
  { type: "bar", name: "A", stack: "total", data: [120, 200] },
  { type: "bar", name: "B", stack: "total", data: [80, 100] },
]
```

### Horizontal bar

Swap axis types to orient bars horizontally:

```ts
xAxis: { type: "value" },
yAxis: { type: "category", data: ["Mon", "Tue", "Wed"] },
series: [{ type: "bar", data: [120, 200, 150] }]
```

All bar options (stack, grouped, itemStyle, label) work the same way.

---

## Scatter

```ts
{
  type: "scatter",
  name?: string,
  data: [number, number][] | [number, number, number][],  // [x, y] or [x, y, size]
  symbolSize?: number | ((val: number[]) => number),
  label?: LabelOption,
  color?: ThemeFamily,
}
```

**Variable bubble size:**
```ts
{
  type: "scatter",
  symbolSize: (val) => Math.sqrt(val[2]) * 4,
  data: [[10, 8.04, 40], [8, 6.95, 20], [13, 7.58, 15]],
}
```

---

## Pie

```ts
{
  type: "pie",
  name?: string,
  data: PieDataItem[],              // { value: number, name: string }[]
  radius?: number | string | [string | number, string | number],  // "60%" or ["35%", "60%"] for donut
  center?: [string | number, string | number],                    // ["50%", "50%"]
  roseType?: "radius" | "area",
  label?: LabelOption,
  labelLine?: LabelLineOption,
}
```

**Donut:**
```ts
{ type: "pie", radius: ["35%", "60%"], data: [...] }
```

---

## Radar

```ts
{
  type: "radar",
  name?: string,
  data: Array<{ value: number[], name: string }>,
  areaStyle?: { opacity?: number },
  lineStyle?: LineStyleOption,
}
```

Requires a `radar` component in the option:
```ts
radar: {
  indicator: [
    { name: "Sales", max: 6500 },
    { name: "Admin", max: 16000 },
    { name: "IT", max: 30000 },
  ],
  shape?: "polygon" | "circle",
  splitNumber?: number,
  startAngle?: number,
}
```

---

## Heatmap

```ts
{
  type: "heatmap",
  name?: string,
  data: [number, number, number][],  // [xIndex, yIndex, value]
}
```

Requires `xAxis`/`yAxis` category axes and a `visualMap` component.

---

## Candlestick

```ts
{
  type: "candlestick",
  name?: string,
  data: [number, number, number, number][],  // [open, close, low, high]
  itemStyle?: {
    color?: string,                  // bullish candle color (close > open)
    color0?: string,                 // bearish candle color
    borderColor?: string,
    borderColor0?: string,
  },
}
```

---

## Gauge

```ts
{
  type: "gauge",
  name?: string,
  data: Array<{ value: number, name: string }>,
  min?: number,
  max?: number,
  startAngle?: number,
  endAngle?: number,
  splitNumber?: number,
  detail?: { formatter?: string },   // "{value}%" etc.
  progress?: { show?: boolean },
}
```

---

## Boxplot

```ts
{
  type: "boxplot",
  name?: string,
  data: [number, number, number, number, number][],  // [min, Q1, median, Q3, max]
}
```

Renders whisker box diagrams via SVG.

---

## Funnel

```ts
{
  type: "funnel",
  name?: string,
  data: FunnelDataItem[],            // { value: number, name: string }[]
  left?: number | string,
  top?: number | string,
  width?: number | string,
  height?: number | string,
  label?: LabelOption,
}
```

Data is sorted descending by value automatically.

---

## Treemap

```ts
{
  type: "treemap",
  name?: string,
  data: TreemapDataItem[],           // { name, value, children? }[]
  top?: number | string,
  left?: number | string,
  width?: number | string,
  height?: number | string,
}
```

Squarified layout. Nested `children` arrays are supported.

---

## Sankey

```ts
{
  type: "sankey",
  nodes: SankeyNode[],               // { name: string }[]
  links: SankeyLink[],               // { source: string, target: string, value: number }[]
  left?: number | string,
  top?: number | string,
  width?: number | string,
  height?: number | string,
  nodeWidth?: number,
  nodeGap?: number,
  layoutIterations?: number,         // relaxation iterations (default 32)
}
```

Layout uses BFS depth assignment + iterative relaxation. Links are bezier curves.

---

## Graph

```ts
{
  type: "graph",
  nodes: GraphNode[],
  links: GraphLink[],
  categories?: GraphCategory[],
  layout?: "force" | "circular" | "none",
  symbolSize?: number,
  edgeSymbol?: [string, string],     // e.g. ["none", "arrow"]
  edgeSymbolSize?: [number, number],
  label?: { show?: boolean },
  force?: {
    repulsion?: number,
    gravity?: number,
    edgeLength?: number,
    layoutAnimation?: boolean,
  },
}

interface GraphNode {
  id?: string,
  name?: string,
  x?: number,
  y?: number,
  symbolSize?: number,
  category?: number,                 // index into categories[]
}

interface GraphLink {
  source: string,                    // node id or name
  target: string,
}

interface GraphCategory {
  name?: string,
}
```

Force layout uses Fruchterman-Reingold (150 iterations, repulsion + spring + gravity).

---

## Labels

```ts
interface LabelOption {
  show?: boolean,
  position?: "top" | "bottom" | "inside" | "left" | "right",
  formatter?: string | ((params: LabelParams) => string),
  fontSize?: number,
  color?: string,
  fontWeight?: string | number,
}
```

Labels are supported on: `bar`, `line`, `scatter`, `pie` (with leader lines and percentage).
