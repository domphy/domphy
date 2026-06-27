---
title: "Axes & Grid"
description: "xAxis, yAxis, grid, polar, dataZoom, and visualMap configuration in @domphy/chart."
---

# Axes & Grid

## xAxis / yAxis

```ts
interface AxisOption {
  type?: "value" | "category" | "time" | "log",
  data?: (string | number)[],          // required for "category" type
  name?: string,
  min?: number | "dataMin",
  max?: number | "dataMax",
  splitNumber?: number,
  gridIndex?: number,
  inverse?: boolean,
  axisLabel?: {
    rotate?: number,
    formatter?: string | ((val: any) => string),
  },
  axisLine?: { show?: boolean },
  axisTick?: { show?: boolean },
  splitLine?: { show?: boolean, lineStyle?: LineStyleOption },
}
```

**Axis types:**
- `"value"` — continuous numeric axis
- `"category"` — categorical (requires `data: string[]`)
- `"time"` — time-based axis (data as timestamps)
- `"log"` — logarithmic scale

**BoundaryGap:**

For category axes, `boundaryGap` (default `true`) adds half-category padding on each side so bars don't touch the axis edges. Set to `false` for line charts that should start at the first point:

```ts
xAxis: { type: "category", data: [...], boundaryGap: false }
```

**Time axis:**

Pass timestamps as data and configure `axisLabel.formatter` to control how ticks display:

```ts
xAxis: {
  type: "time",
  axisLabel: {
    formatter: (value: number) => {
      const d = new Date(value)
      return `${d.getMonth() + 1}/${d.getDate()}`
    },
  },
}
```

Series data for a time axis uses `[timestamp, value]` pairs:

```ts
series: [{
  type: "line",
  data: [
    [new Date("2024-01-01").getTime(), 120],
    [new Date("2024-02-01").getTime(), 200],
    [new Date("2024-03-01").getTime(), 150],
  ],
}]
```

**Log axis:**

```ts
yAxis: { type: "log", min: 1 }
```

Useful for data spanning multiple orders of magnitude (e.g. network traffic, financial data).

**Multiple axes:**

Pass an array to use multiple x or y axes. Series reference them by index:

```ts
{
  xAxis: [
    { type: "category", data: ["Jan", "Feb", "Mar"] },
    { type: "value", position: "top" },
  ],
  yAxis: [
    { type: "value" },
    { type: "value", position: "right" },
  ],
  series: [
    { type: "bar", data: [120, 200, 150], xAxisIndex: 0, yAxisIndex: 0 },
    { type: "line", data: [1.2, 0.8, 1.5], xAxisIndex: 0, yAxisIndex: 1 },
  ],
}
```

## Grid

```ts
interface GridOption {
  top?: number | string,     // px or "%"
  bottom?: number | string,
  left?: number | string,
  right?: number | string,
  containLabel?: boolean,
}
```

Controls the inner chart area. Defaults: `top: 60, bottom: 60, left: 60, right: 20`.

```ts
// Make room for legend and axis labels:
grid: { top: 60, bottom: 50, left: 70, right: 20 }
```

## Polar

```ts
interface PolarOption {
  center?: [string | number, string | number],
  radius?: string | number | [string | number, string | number],
}
```

Used with radar and radial series.

## DataZoom

Enables range selection / scrolling on axes.

```ts
dataZoom: [
  {
    type: "slider",          // visual scrollbar below chart
    xAxisIndex: 0,
    start: 0,                // 0–100 (%)
    end: 40,
    bottom: 10,
  },
  {
    type: "inside",          // mouse wheel zoom on the axis
    xAxisIndex: 0,
  },
]
```

Both types can coexist. `inside` enables scroll-to-zoom without any visual element.

## VisualMap

Maps data values to colors. Two modes:

**Continuous** — gradient color bar:
```ts
visualMap: {
  type: "continuous",
  min: 0,
  max: 10,
  right: 0,
  top: "center",
  orient: "vertical",
}
```

**Piecewise** — discrete color steps:
```ts
visualMap: {
  type: "piecewise",
  pieces: [
    { min: 0, max: 3, color: "#ccc" },
    { min: 3, max: 7, color: "#f80" },
    { min: 7, max: 10, color: "#f00" },
  ],
}
```

Use `colorFromVisualMap(vm, value)` exported from `@domphy/chart` to resolve a value to its mapped color at runtime.

## Tooltip

```ts
tooltip: {
  trigger?: "axis" | "item",
  axisPointer?: { type?: "line" | "shadow" | "cross" },
  formatter?: string | ((params: TooltipParams | TooltipParams[]) => string),
}
```

`trigger: "axis"` shows tooltip for all series at the hovered x value (use with line/bar). `trigger: "item"` shows tooltip for the individual data point closest to the cursor. Works for `scatter` and `pie` series.

## Legend

```ts
legend: {
  data?: string[],                  // series names; omit to auto-detect
  orient?: "horizontal" | "vertical",
  left?: number | string,
  top?: number | string,
  right?: number | string,
  bottom?: number | string,
}
```

Legend items are **interactive** — click to show/hide the corresponding series.

## Title

```ts
title: {
  text?: string,
  subtext?: string,
  left?: "left" | "center" | "right" | number | string,
  top?: number | string,
}
```

## Toolbox

Built-in chart toolbar with export, zoom, restore, and data-view actions.

```ts
toolbox: {
  show: true,
  right: 20,       // distance from right edge
  top: 10,
  feature: {
    saveAsImage: { title: "Save" },              // download PNG
    dataZoom: { yAxisIndex: "none" },            // range select on x axis
    restore:  { title: "Reset" },               // reset zoom/pan
    dataView: { readOnly: false, title: "Data" }, // tabular data view/edit
    brush: { type: ["rect", "lineX", "keep", "clear"] }, // enable brush tool
  },
}
```

`yAxisIndex: "none"` keeps the y axis fixed while zooming x. Use `"all"` to allow y-axis zoom too.

## Brush

Area selection for highlighting or filtering data points.

```ts
brush: {
  toolbox: ["rect", "lineX", "keep", "clear"],   // tools available without toolbox component
  brushLink: "all",                              // sync brush across all series
  brushType: "rect",                             // default tool: "rect" | "polygon" | "lineX" | "lineY"
  brushMode: "single",                           // "single" | "multiple" selections
  inBrush: { opacity: 1 },
  outOfBrush: { opacity: 0.2 },                  // dim unselected points
}
```

Brush is most useful paired with the `toolbox.feature.brush` to give users a UI toggle. The `brushLink` option syncs selection across multiple series sharing the same axis.

## Animation

Charts animate in by default. Configure or disable:

```ts
// Disable all animation (useful for SSR or performance-critical renders):
{
  animation: false,
}

// Customize duration and easing:
{
  animation: true,
  animationDuration: 800,          // ms for initial render animation
  animationEasing: "cubicOut",     // easing function name (ECharts easing names)
  animationDurationUpdate: 300,    // ms for data-update transitions
}
```

Common `animationEasing` values: `"linear"`, `"quadraticIn"`, `"quadraticOut"`, `"cubicOut"`, `"elasticOut"`, `"bounceOut"`.

Set `animation: false` on individual series to disable animation for that series only:

```ts
series: [
  { type: "line", data: [...], animation: false },
  { type: "bar",  data: [...] },   // still animates
]
```
