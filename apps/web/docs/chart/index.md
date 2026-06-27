---
title: "@domphy/chart"
description: "ECharts-grade charting for Domphy — WebGL line/bar/scatter/pie/radar/heatmap/candlestick/gauge, SVG boxplot/funnel/treemap/sankey/graph/parallel/themeRiver/map, calendar, 3D surface. Tone/density cascade."
---

# @domphy/chart

ECharts-grade charting for Domphy. WebGL-accelerated series for performance-critical data, SVG series for complex layouts. Full parity with ECharts including geo maps, calendar, parallel coordinates, ThemeRiver, and 3D charts. No React dependency.

## Install

```bash
npm install @domphy/chart
```

## Quick start — `chart()` patch

The easiest way: apply the `chart()` patch to any `div`. It creates and manages a `ChartEngine` internally.

```ts
import { chart } from "@domphy/chart"
import type { ChartOption } from "@domphy/chart"

const option: ChartOption = {
  xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: [120, 200, 150, 80, 70] }],
}

const App = {
  div: null,
  style: { width: "600px", height: "300px", position: "relative" },
  $: [chart(option)],
}
```

To update the chart reactively, pass a `State<ChartOption>`:

```ts
import { toState } from "@domphy/core"
import { chart } from "@domphy/chart"

const option = toState<ChartOption>({
  series: [{ type: "line", data: [1, 2, 3] }],
})

const App = {
  div: null,
  style: { width: "600px", height: "300px", position: "relative" },
  $: [chart(option)],
}

// Update later:
option.set({ series: [{ type: "line", data: [4, 5, 6] }] })
```

The chart re-renders whenever the state changes.

## Supported series

**WebGL (hardware-accelerated):**
| Series | Key options |
|---|---|
| `line` | `smooth`, `step`, `areaStyle`, `connectNulls`, `stack` |
| `bar` | `stack`, `label`, grouped; **horizontal** when `yAxis: "category"` + `xAxis: "value"` |
| `scatter` | `symbolSize` (number or `(val) => number`) |
| `pie` | `radius` (number or `[inner, outer]`), `roseType`, `center` |
| `radar` | `areaStyle`, paired with `radar.indicator[]` |
| `heatmap` | cartesian or `coordinateSystem: "calendar"` with `visualMap` |
| `candlestick` | `data: [open,close,low,high][]`, `itemStyle.color`/`color0` |
| `gauge` | `min`/`max`, `splitNumber`, `detail.formatter` |

**SVG (layout & flow):**
| Series | Key options |
|---|---|
| `boxplot` | `data: [min,Q1,median,Q3,max][]` |
| `funnel` | `data: [{value,name}]` sorted descending |
| `treemap` | `data` with nested `children`, squarified layout |
| `sankey` | `nodes: [{name}]`, `links: [{source,target,value}]` |
| `graph` | `nodes`, `links`, `categories`, `layout: "force"\|"circular"\|"none"` |
| `parallel` | multi-dim polylines across `parallelAxis[]` |
| `themeRiver` | stream graph; `data: [[time, value, name], ...]` |
| `map` | choropleth; `geo` + `registerMap(name, geoJSON)` |
| `lines` | flow map arcs; `data: [{coords: [[lng,lat],[lng,lat]]}]`, optional `effect` dot animation |
| `effectScatter` | scatter with SVG ripple animation; `rippleEffect: {period, scale, brushType}` |
| `pictorialBar` | bar with symbol shapes; `symbol`, `symbolRepeat`, `symbolClip` |
| `custom` | `renderItem(params, api)` returns SVG element descriptor |

**3D (SVG perspective projection):**
| Series | Key options |
|---|---|
| `scatter3D` | `data: [x,y,z][]`, `symbolSize` |
| `bar3D` | `data: [x,y,z][]`, `barSize` |
| `line3D` | `data: [x,y,z][]`, `lineWidth` |
| `surface3D` | structured grid `data: [x,y,z][]`, `shapeW`, `shapeH`, `wireframe` |

## Next steps

- [Series Reference](/docs/chart/series) — all series options with examples
- [Axes & Grid](/docs/chart/axes) — axes types, formatting, dataZoom, visualMap
- [Colors & Theme](/docs/chart/colors) — theme families, gradient fills
- [ChartEngine API](/docs/chart/engine) — advanced embedding, resize, destroy
- [vs ECharts](/docs/chart/vs-echarts) — feature comparison
