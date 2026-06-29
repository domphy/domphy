# @domphy/chart

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/chart/) · [npm](https://www.npmjs.com/package/@domphy/chart)

ECharts-grade charting for Domphy. WebGL-accelerated series for performance-critical data, SVG series for complex layouts. Integrates with Domphy's tone/density cascade — charts inherit your design system's color and surface tokens automatically.

## Install

```bash
npm install @domphy/chart
```

Peer dependencies: `@domphy/core`, `@domphy/theme`.

## Quick start — `chart()` patch

Apply `chart()` to any `div` to create a self-managing chart:

```ts
import { chart } from "@domphy/chart"
import type { ChartOption } from "@domphy/chart"

const App = {
  div: null,
  style: { width: "600px", height: "300px", position: "relative" },
  $: [chart({
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: [120, 200, 150, 80, 70] }],
  })],
}
```

## Reactive option

Pass a `State<ChartOption>` to re-render automatically on updates:

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

option.set({ series: [{ type: "line", data: [4, 5, 6] }] })  // triggers re-render
```

## Supported series

**WebGL (hardware-accelerated):**

| Series | Key options |
|---|---|
| `line` | `smooth`, `step`, `areaStyle`, `connectNulls`, `stack` |
| `bar` | `stack`, `label`, grouped; horizontal when `yAxis: "category"` |
| `scatter` | `symbolSize` (number or `(val) => number`) |
| `pie` | `radius`, `roseType`, `center` |
| `radar` | `areaStyle`, paired with `radar.indicator[]` |
| `heatmap` | cartesian or `coordinateSystem: "calendar"` with `visualMap` |
| `candlestick` | `data: [open,close,low,high][]` |
| `gauge` | `min`/`max`, `splitNumber`, `detail.formatter` |

**SVG (layout & flow):**

| Series | Key options |
|---|---|
| `boxplot` | `data: [min,Q1,median,Q3,max][]` |
| `funnel` | `data: [{value,name}]` |
| `treemap` | `data` with nested `children`, squarified layout |
| `sankey` | `nodes`, `links: [{source,target,value}]` |
| `graph` | `nodes`, `links`, `layout: "force"\|"circular"\|"none"` |
| `parallel` | multi-dim polylines across `parallelAxis[]` |
| `themeRiver` | stream graph; `data: [[time, value, name], ...]` |
| `map` | choropleth; `geo` + `registerMap(name, geoJSON)` |
| `lines` | flow map arcs with optional `effect` animation |
| `effectScatter` | scatter with SVG ripple animation |
| `pictorialBar` | bar with symbol shapes; `symbol`, `symbolRepeat` |
| `custom` | `renderItem(params, api)` returns SVG element descriptor |

**3D (SVG perspective projection):**

| Series | Key options |
|---|---|
| `scatter3D` | `data: [x,y,z][]` |
| `bar3D` | `data: [x,y,z][]`, `barSize` |
| `line3D` | `data: [x,y,z][]`, `lineWidth` |
| `surface3D` | structured grid, `shapeW`/`shapeH`, `wireframe` |

## ChartEngine (advanced)

Use `ChartEngine` directly for manual lifecycle control:

```ts
import { ChartEngine } from "@domphy/chart"

const engine = new ChartEngine(container)
await engine.init()
engine.setSize(600, 300)
engine.setOption({ series: [{ type: "bar", data: [10, 20, 15] }] })

// When removing from DOM:
engine.destroy()
```

See the [full docs](https://domphy.com/docs/chart/) for axes, colors, events, geo maps, and vs-ECharts comparison.
