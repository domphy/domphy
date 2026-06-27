---
title: "Series Reference"
description: "All @domphy/chart series types — line, bar, scatter, pie, radar, heatmap, candlestick, gauge, boxplot, funnel, treemap, sankey, graph, parallel, themeRiver, map, calendar, scatter3D, bar3D, line3D, surface3D."
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

---

## Calendar (coordinate system)

Requires `calendar` in the option. Use with `heatmap` (set `coordinateSystem: "calendar"`).

```ts
{
  calendar: {
    range: "2024",                        // full year, or ["2024-01-01", "2024-06-30"]
    cellSize?: number | [w, h],           // default 20
    dayLabel?: { firstDay?: 0|1, show?: boolean },
    monthLabel?: { show?: boolean },
    yearLabel?: { show?: boolean },
  },
  series: [{
    type: "heatmap",
    coordinateSystem: "calendar",
    data: [
      ["2024-01-15", 42],
      ["2024-03-22", 87],
      // ...
    ],
  }],
  visualMap: { type: "continuous", min: 0, max: 100 },
}
```

---

## Parallel Coordinates

```ts
{
  parallel: { left: "10%", right: "5%", top: "10%", bottom: "10%" },
  parallelAxis: [
    { dim: 0, name: "Income",    type: "value" },
    { dim: 1, name: "Age",       type: "value" },
    { dim: 2, name: "Education", type: "category", data: ["High School","BSc","MSc","PhD"] },
  ],
  series: [{
    type: "parallel",
    data: [
      [45000, 32, "BSc"],
      [72000, 45, "MSc"],
      [28000, 24, "High School"],
    ],
    lineStyle: { opacity: 0.5 },
  }],
}
```

Each row becomes a polyline crossing each axis at its value position.

---

## ThemeRiver

Stream/river chart showing changes in topic proportions over time.

```ts
{
  series: [{
    type: "themeRiver",
    data: [
      // [time, value, topic-name]
      ["2024-01", 20, "Topic A"],
      ["2024-02", 35, "Topic A"],
      ["2024-01", 15, "Topic B"],
      ["2024-02", 25, "Topic B"],
    ],
  }],
}
```

Multiple series names in the same dataset are stacked as separate streams. The baseline is silhouette-centered (zero-centered sum), giving the characteristic river shape.

---

## Map (choropleth)

Requires calling `registerMap` before use.

```ts
import { registerMap } from "@domphy/chart"

// Register a GeoJSON (e.g. world countries from naturalearth)
registerMap("world", worldGeoJSON)

// Option:
{
  geo: {
    map: "world",
    roam: true,   // enable pan/zoom (not yet interactive — reserved for future)
    zoom: 1.2,
    center: [0, 20],
  },
  series: [{
    type: "map",
    map: "world",
    data: [
      { name: "China",         value: 89 },
      { name: "United States", value: 73 },
      { name: "Germany",       value: 61 },
    ],
  }],
  visualMap: { type: "continuous", min: 0, max: 100 },
}
```

`scatter` series with `coordinateSystem: "geo"` render as circles at `[lng, lat]` coordinates.

---

## scatter3D / bar3D / line3D / surface3D

All 3D series require `grid3D`. Projection is perspective SVG (no WebGL needed).

```ts
{
  grid3D: {
    viewControl: { alpha: 35, beta: 45, distance: 180 },
  },
  xAxis3D: { name: "X", type: "value" },
  yAxis3D: { name: "Y", type: "value" },
  zAxis3D: { name: "Z", type: "value" },
  series: [
    {
      type: "scatter3D",
      symbolSize: 10,
      color: "primary",
      data: [[1,2,3], [4,5,6], [7,8,9]],
    },
    {
      type: "line3D",
      lineWidth: 2,
      color: "secondary",
      data: [[0,0,0], [1,2,4], [2,4,8]],
    },
    {
      type: "bar3D",
      barSize: 0.05,
      color: "success",
      data: [[0,1,5], [1,1,8], [2,1,3]],
    },
  ],
}
```

### surface3D

Renders a 3D surface from a structured grid of `[x, y, z]` points. Z-value is mapped to a blue→green→red color gradient.

```ts
{
  grid3D: { viewControl: { alpha: 30, beta: 50 } },
  xAxis3D: { type: "value" },
  yAxis3D: { type: "value" },
  zAxis3D: { type: "value" },
  series: [{
    type: "surface3D",
    shapeW: 20,   // grid columns
    shapeH: 20,   // grid rows
    wireframe: { show: true },
    data: (() => {
      const points = []
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          const x = (i / 19) * 4 - 2
          const y = (j / 19) * 4 - 2
          const z = Math.sin(Math.sqrt(x * x + y * y))
          points.push([x, y, z])
        }
      }
      return points
    })(),
  }],
}
```
