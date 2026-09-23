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
| `custom` | `renderItem(params, api)` — cartesian2d/none only, see [Series reference](https://domphy.com/docs/chart/series#custom-series-renderitem) |

`brush` (`rect`/`lineX`/`lineY` drag-select + `brushSelected` event +
`inBrush`/`outOfBrush` dimming, on scatter/line incl. stacked/bar/candlestick)
and `toolbox.feature.brush` are implemented — see
[Brush](https://domphy.com/docs/chart/axes#brush).

> **Not implemented (typed for ECharts interop only):** a `brush.brushType`/
> `toolbox.feature.brush.type` of `"polygon"`, and a `custom` series with
> `coordinateSystem: "polar"`/`"geo"`. Passing them logs a console warning and
> has no render effect.
> `emphasis`/`blur`/`select` are implemented for line/bar/scatter/pie/radar/
> heatmap/candlestick/gauge/boxplot/funnel, with real per-shape mouse
> hover/click hit-testing (heatmap cell, candlestick/boxplot body+wick box,
> radar polygon, funnel trapezoid, gauge progress arc) on all ten, plus
> legend hover/focus for whole-series highlighting.
> Individual option keys that are typed but not rendered are listed in full
> in [vs ECharts](https://domphy.com/docs/chart/vs-echarts).

**3D (SVG perspective projection):**

| Series | Key options |
|---|---|
| `scatter3D` | `data: [x,y,z][]` |
| `bar3D` | `data: [x,y,z][]`, `barSize` |
| `line3D` | `data: [x,y,z][]`, `lineWidth` |
| `surface3D` | structured grid, `shapeW`/`shapeH`, `wireframe` |

## Interaction & accessibility

Tooltips, the axis pointer and the dataZoom slider work with mouse, touch and pen. `chart()` takes an optional `click` handler that reports the data item under the cursor (nothing fires on empty space, as in ECharts):

```ts
$: [chart(option, { click: (params) => console.log(params.seriesName, params.value) })]
```

The overlay SVG carries `role="img"` and an `aria-label` derived from the title or the rendered series; legend items are WAI-ARIA APG toggle buttons (focusable, `aria-pressed`, <kbd>Enter</kbd>/<kbd>Space</kbd>, visible focus ring). WebGL context loss is recovered automatically.

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
