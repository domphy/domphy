---
title: "Interaction & Events"
description: "How to handle user interaction in @domphy/chart — tooltip formatters, click handlers, legend toggles, and reactive option updates."
---

# Interaction & Events

`@domphy/chart` handles interaction through Domphy's reactive system rather than an event emitter API. The chart re-renders automatically when its option state changes; user events surface through tooltip formatters and direct DOM handlers on series symbols.

## Tooltip

### Axis trigger (line / bar)

```ts
{
  tooltip: {
    trigger: "axis",
    formatter: (params) => {
      // params is an array when trigger: "axis"
      const list = Array.isArray(params) ? params : [params]
      return list.map(p => `${p.seriesName}: ${p.value}`).join("<br>")
    },
  },
}
```

### Item trigger (scatter / pie)

```ts
{
  tooltip: {
    trigger: "item",
    formatter: (params) => {
      // params is a single object when trigger: "item"
      const p = Array.isArray(params) ? params[0] : params
      return `${p.name}: ${p.value} (${p.percent}%)`
    },
  },
}
```

### Axis pointer style

```ts
tooltip: {
  trigger: "axis",
  axisPointer: { type: "shadow" },   // "line" | "shadow" | "cross"
}
```

`"shadow"` draws a shaded band across the category. `"cross"` draws crosshair lines on both axes.

## Reactive updates

The most common interaction pattern: bind a `State<ChartOption>` and update it from UI controls.

```ts
import { toState } from "@domphy/core"
import { chart } from "@domphy/chart"
import { button } from "@domphy/ui"

const option = toState({
  xAxis: { type: "category", data: ["Mon", "Tue", "Wed"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: [120, 200, 150] }],
})

const App = {
  div: null,
  $: [],
  _: [
    {
      div: null,
      style: { width: "600px", height: "300px", position: "relative" },
      $: [chart(option)],
    },
    {
      button: "Refresh data",
      $: [button()],
      onClick: () => option.set({
        ...option.get(),
        series: [{ type: "bar", data: [Math.random() * 300, Math.random() * 300, Math.random() * 300] }],
      }),
    },
  ],
}
```

The chart re-renders whenever `option.set()` is called — no `setOption()` required.

## Legend interaction

Legend items are interactive out of the box — clicking a legend item toggles the corresponding series. No extra config needed.

To detect which series are currently hidden, read `hiddenSeries` from `ChartEngine` directly:

```ts
import { ChartEngine } from "@domphy/chart"

const engine = new ChartEngine(container)
await engine.init()
engine.setOption(option)

// After user toggles legend:
// engine.hiddenSeries is a Set<string> of hidden series names
```

## DataZoom interaction

Slider datazoom responds to drag and mouse events automatically:

```ts
{
  dataZoom: [
    { type: "slider", xAxisIndex: 0, start: 0, end: 50 },
    { type: "inside", xAxisIndex: 0 },  // scroll-to-zoom without UI
  ],
}
```

`type: "inside"` enables mouse wheel zoom and drag pan on the axis directly — no visible handle.

## Click on data points

Use `tooltip.formatter` to react to hover. For click, wire an `onClick` on the chart container:

```ts
import { ChartEngine } from "@domphy/chart"

const engine = new ChartEngine(container)
await engine.init()
engine.setOption(option)

container.addEventListener("click", (e) => {
  // Use tooltip params if you need the hovered data point
  // engine.lastTooltipParams holds the last hovered params
})
```

For more targeted interaction, use the `chart()` patch with a container `onClick` in your element tree:

```ts
const selected = toState<string | null>(null)

const App = {
  div: null,
  style: { width: "600px", height: "300px", position: "relative", cursor: "pointer" },
  $: [chart(option)],
  onClick: (e: MouseEvent) => {
    // handle selection at the application level
    selected.set("clicked")
  },
}
```

## Watching state from outside

Since the chart is driven by a `State<ChartOption>`, you can derive computed values from the same state using `computed()`:

```ts
import { toState, computed } from "@domphy/core"

const rawData = toState([120, 200, 150, 80])

const option = computed((l) => ({
  xAxis: { type: "category", data: ["A", "B", "C", "D"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: rawData.get(l) }],
}))

// Chart auto-updates when rawData changes:
rawData.set([300, 150, 400, 100])
```
