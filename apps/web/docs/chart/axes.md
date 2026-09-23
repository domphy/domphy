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

`false` puts category 0 on the axis line and the last category on the far edge. Series that size their elements from the category band (`bar`, `candlestick`, `boxplot`, `heatmap`) still get a band — `width / (categories - 1)` instead of `width / categories`, matching ECharts' `getBandWidth()` — so they straddle the ticks and clip at the two ends rather than disappearing.

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

> **Note:** `polar`, `radiusAxis`, and `angleAxis` options are typed in `ChartOption` but the polar coordinate system is not yet rendered by the engine. Bar and scatter series with `coordinateSystem: "polar"` will not display. Use `radar` series for spider/radial charts — it uses its own `radar` option, not the polar coordinate system.

```ts
interface PolarOption {
  center?: [string | number, string | number],
  radius?: string | number | [string | number, string | number],
}
```

When polar rendering is available, `radiusAxis` and `angleAxis` configure the two axes of the polar coordinate system.

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

A continuous visualMap drives the colour of the `heatmap` cells it targets (`seriesIndex`, or every series when it is omitted): `min`/`max` set the range the ramp spans — without them the cells fall back to their own data extent — and `inRange.color` sets the ramp itself, so the cells and the legend bar always show the same colours. A value outside `[min, max]` is not drawn unless `outOfRange.color` is given; ECharts' default out-of-range colour is `rgba(0,0,0,0)`.

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
  formatter?:
    | string
    | ((
        params: TooltipParams | TooltipParams[],
        ticket: string,
        callback: (ticket: string, html: string) => void,
      ) => string | DomphyElement),
}
```

`formatter` may return a `DomphyElement` (plain object) or a string.

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

Renders a keyboard-operable `role="toolbar"` of real `<button>` elements inside
the chart container. Every button carries an `aria-label` (the feature's
`title`, or the ECharts default) and a visible focus ring.

```ts
toolbox: {
  show: true,
  orient: "horizontal",   // or "vertical"
  itemSize: 15,
  itemGap: 8,
  right: 20,       // distance from right edge
  top: 10,
  feature: {
    saveAsImage: { title: "Save" },              // download PNG
    dataZoom: { yAxisIndex: "none" },            // drag-select range on the x axis only
    restore:  { title: "Reset" },                // back to the option you passed
    dataView: { readOnly: false, title: "Data" }, // tabular data view/edit
    magicType: { type: ["line", "bar", "stack"] }, // switch series type
  },
}
```

**Feature notes.**

- `saveAsImage`: `type: "png"`/`"jpg"` (default) composites the WebGL canvas
  and both SVG layers into one raster image, resolving `var(--…)` theme
  references and painting the theme surface behind them first (a transparent
  export of a dark-theme chart is unreadable). `type: "svg"` produces a real
  SVG document — the axes/legend/labels this package already draws as SVG
  stay vector, and the WebGL-rasterized series (bar/line/scatter/…, which have
  no vector form to re-derive) are embedded as one raster `<image>` (both
  `href` and `xlink:href`, so older and newer SVG consumers alike resolve it)
  instead of silently falling back to a PNG.
- `dataZoom` toggles a rectangle-select mode over the plot; Escape cancels.
  Both axes zoom by default — dragging changes the x window, the y window, or
  both, matching whichever edges the rectangle actually spans. Set
  `xAxisIndex: "none"` (or `false`) to zoom the y axis only, or `yAxisIndex:
  "none"` for the x axis only (as above); setting both disables the feature
  and warns instead of rendering a dead button. Zooming a series-specific
  axis by index (rather than every axis of that kind) and `filterMode` have
  no effect.
- `dataView` opens a panel inside the chart; `readOnly: false` gives a textarea
  whose Refresh applies edited numbers back to the series. Escape closes it and
  returns focus to the button.
- `magicType` rewrites every cartesian series' `type`/`stack` and never mutates
  the option you passed.
- `feature.brush` renders real `rect`/`lineX`/`lineY`/`keep`/`clear` buttons
  (see **Brush** below); a `polygon` tool in its `type` list warns instead of
  rendering.

## Brush

Drag-select a `rect`, `lineX` or `lineY` area over the plot. Hit-tested series:
scatter, line (including a **stacked** line, tested against its cumulative
position), bar (any grouped/stacked/horizontal/vertical layout) and
candlestick (body + wick bounding box) — boxplot/heatmap/pie are not. This is
parity with upstream ECharts, not a gap: ECharts' own `BarSeriesModel`/
`CandlestickSeriesModel`/etc. implement a `brushSelector(dataIndex, data,
selectors)` method that its brush component calls, but `PieSeriesModel`,
`HeatmapSeriesModel` and `BoxplotSeriesModel` implement no such method
upstream either (verified against `apache/echarts` source, `master` branch)
— their rendered position depends on renderer-specific layout math neither
implementation duplicates for brush. A `brushSelected` event reports which data indices fall inside,
and `inBrush`/`outOfBrush` dim the un-brushed points on every hit-tested
series (including a line's own point symbols). Works standalone
(`option.brush` alone, no toolbox needed — its default `brushType: "rect"` is
drag-active immediately) or driven by `toolbox.feature.brush`'s buttons.

```ts
brush: {
  brushType: "rect",     // default tool, active with no toolbox: "rect" | "lineX" | "lineY" ("polygon" warns, not rendered)
  brushMode: "single",   // "single" replaces the area on each drag; "multiple" accumulates (selection = their union)
  brushStyle: { color: "primary", borderColor: "primary", borderWidth: 1, opacity: 0.15 },
  inBrush: { opacity: 1 },        // default — brushed-in data is unchanged
  outOfBrush: { opacity: 0.3 },   // default — everything else in a brushable series fades
}
```

```ts
toolbox: {
  feature: {
    brush: { type: ["rect", "lineX", "lineY", "keep", "clear"] },
  },
}
```

```ts
chart(option, {
  brushSelected: (params) => {
    // params.batch[0].selected: [{ seriesIndex, dataIndex: [...] }, ...]
  },
})
```

**Not implemented:** `polygon` brush type (freehand area — typed, warns
instead of rendering), `brushLink`, `transformable`,
`throttleType`/`throttleDelay`, `removeOnClick`. `seriesIndex`/`xAxisIndex`/
`yAxisIndex` scoping is not honoured — every eligible series is always
hit-tested, regardless of these fields.

## Animation

> **Not implemented yet.** Charts render statically: the `animation*` keys
> (`animation`, `animationDuration`, `animationEasing`, `animationDelay`,
> `animationDurationUpdate`, …) are typed on the top-level option and on every
> series for ECharts interop — ECharts options migrate without type errors —
> but no enter/update tweening runs. The exceptions are the series that carry
> their own SVG effects: `effectScatter` (ripple) and `lines` (`effect` dot via
> `animateMotion`).

```ts
// Accepted for ECharts interop; currently has no visual effect:
{
  animation: false,
  animationDuration: 800,
  animationEasing: "cubicOut",
  animationDurationUpdate: 300,
}
```
