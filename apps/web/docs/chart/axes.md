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

`trigger: "axis"` shows tooltip for all series at the hovered x value (use with line/bar). `trigger: "item"` shows tooltip for the individual data point (use with pie/scatter).

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
