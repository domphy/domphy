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

### Overflow and `appendToBody`

The `chart()` host is `overflow: visible`, so the default in-container tooltip can extend past the plot box. To also escape `overflow: hidden` on an *ancestor* of the host (a card, a scroll area), set `tooltip.appendToBody: true` — the tooltip mounts on `document.body` with `position: fixed`.

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
  div: [
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

Legend items are interactive out of the box — clicking a legend item toggles the corresponding series. Hidden-series state is internal to `ChartEngine` (not a public field). Drive visibility from `option.legend.selected` / `option.set(...)` if the app needs to know.

Each item is also a real toggle button for assistive tech and keyboard users: `role="button"`, `tabindex="0"`, `aria-label` set to the series name and `aria-pressed` reflecting visibility, activated with <kbd>Enter</kbd> or <kbd>Space</kbd> (WAI-ARIA APG button pattern). Focus moves with the item across the re-render a toggle triggers, and the focused item draws a visible ring. `legend.selectedMode: false` makes the items non-interactive and drops them from the tab order.

## DataZoom interaction

Slider datazoom responds to drag automatically, with mouse, touch or pen (it is wired on pointer events, and the move/release listeners sit on `document`, so a drag that leaves the slider keeps tracking). The grid reserves the band the slider occupies unless `grid.bottom` is set explicitly, so the slider never covers the axis labels.

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

The `chart()` patch takes an optional second argument with a `click` handler. It fires with the params of the data item under the cursor — the same `TooltipParams` shape a tooltip formatter receives — and does not fire at all for a click on empty space (ECharts semantics).

```ts
import { toState } from "@domphy/core"
import { chart } from "@domphy/chart"

const selected = toState<string | null>(null)

const App = {
  div: null,
  style: { width: "600px", height: "300px", position: "relative", cursor: "pointer" },
  $: [
    chart(option, {
      click: (params) => {
        // params.seriesName / .name / .value / .dataIndex / .seriesIndex
        selected.set(params.name)
      },
    }),
  ],
}
```

Hit-testing is per item whatever `tooltip.trigger` is set to: a click identifies one datum, while the axis trigger's row set is a hover affordance. It works with `tooltip: { show: false }` too.

On `ChartEngine` directly the same event is `on("click", handler)`, which returns an unsubscribe function (`off("click", handler)` also works):

```ts
import { ChartEngine } from "@domphy/chart"

const engine = new ChartEngine(container)
await engine.init()
engine.setOption(option)

const stop = engine.on("click", (params) => {
  console.log(params.seriesName, params.value)
})
// stop() later, or engine.destroy() drops every handler
```

## Emphasis, blur and select

The ECharts interaction states are supported on **line, bar, scatter, pie,
radar, heatmap, candlestick, gauge, boxplot and funnel**. They are **opt-in**:
a series must declare `emphasis`, `blur`, `select` or `selectedMode`. An
option that says nothing about them is not hover-tracked at all, so it never
re-renders on pointer move.

Per-datum mouse hover/click hit-testing (mouse over one bar highlights just
that bar) reaches all ten types: heatmap tests the cell's own rect,
candlestick/boxplot the body+wick bounding box (candlestick shares its box
with the [Brush](/docs/chart/axes#brush) drag-select), radar a
point-in-polygon test against the hovered shape, funnel a point-in-trapezoid
test against the hovered slice, and gauge an annulus + angular-sweep test
against the progress arc. Each of those five is the SAME geometry function
its renderer paints from, so a hover/click can never land on a shape
different from what is on screen — verified with real mouse moves in
Chromium. **Legend hover/focus** (`emphasis.focus: "series"` blurs every
other series while the pointed-at one stays normal) still works for
whole-series highlighting on top of this, and an app can also drive
`ChartEngine`'s selection state directly.

```ts
{
  series: [
    {
      type: "bar",
      name: "Revenue",
      data: [120, 200, 150],
      // Hovering any bar of this series lifts the whole series and fades the
      // rest of the coordinate system to a tenth of its alpha.
      emphasis: { focus: "series" },
      // Clicking a bar toggles its `select` state and fires `selectchanged`.
      selectedMode: "multiple",
      select: { itemStyle: { color: "attention" } },
    },
    { type: "bar", name: "Costs", data: [90, 140, 110] },
  ],
}
```

| Key | Effect |
|---|---|
| `emphasis.focus` | `"none"` (default) emphasises only the hovered datum; `"self"` also blurs everything else; `"series"` emphasises the whole hovered series |
| `emphasis.blurScope` | which elements the blur reaches: `"coordinateSystem"` (default), `"series"`, `"global"` |
| `emphasis.itemStyle` | `color` / `opacity` for the emphasised element. With none declared the colour is lifted 10% (ECharts' `liftColor`) so the state is still visible |
| `emphasis.scale` | symbol/sector enlargement — `true` (the default for symbol series), `false`, or the ratio itself. Pie also takes `emphasis.scaleSize` (px of extra radius, default 10) |
| `emphasis.label` | merged over the series' `label` while the **whole** series is in the state |
| `emphasis.disabled` | turns the state off for that series |
| `blur.itemStyle.opacity` | the faded alpha (default `0.1`) |
| `select.itemStyle` | style of a selected datum. A selected pie slice also slides out by `selectedOffset` (default 10) |
| `selectedMode` | `"single"` (one datum per series), `"multiple"` / `true`, `"series"` (the whole series at once), or `false` (default — clicking selects nothing) |
| `legendHoverLink` | `false` opts the series out of the legend highlight below |

Pointing at — **or keyboard-focusing** — a legend item highlights its series,
so <kbd>Tab</kbd> reaches the same affordance a mouse does.

### `selectchanged`

```ts
chart(option, {
  selectchanged: (params) => {
    // params.fromAction: "select" | "unselect"
    // params.selected: [{ seriesIndex: 0, dataIndex: [2, 5] }]
    console.log(params.selected)
  },
})
```

On `ChartEngine` the same event is `engine.on("selectchanged", handler)`, and
`engine.getSelectedDataIndices()` reads the current selection back in the same
shape. A selection is dropped when `setOption()` brings a different set of
series (the index space changed); a data-only refresh keeps it.

**Not covered:** a per-datum `emphasis`/`blur`/`select` on a data item, and the
states on any other series type (candlestick, boxplot, gauge, funnel, treemap,
sankey, graph, radar, heatmap, map, the 3D series). Those keys still carry the
`@deprecated` marker described in [vs-echarts](/docs/chart/vs-echarts).

## Brush

Drag a `rect`/`lineX`/`lineY` area over the plot (see [Brush](/docs/chart/axes#brush))
and `brushSelected` fires with the ECharts-shaped batch:

```ts
chart(option, {
  brushSelected: (params) => {
    // params.batch[0].areas: [{ brushType: "rect", range: [[x0,y0],[x1,y1]] }]
    // params.batch[0].selected: [{ seriesIndex: 0, dataIndex: [2, 5] }]
    console.log(params.batch[0].selected)
  },
})
```

On `ChartEngine` the same event is `engine.on("brushSelected", handler)`.
Scatter, line (incl. stacked), bar and candlestick are hit-tested, and
`inBrush`/`outOfBrush` dim the rest of a brushable series — see the **Brush**
section of the axes reference for the full "not implemented" list (`polygon`,
`seriesIndex`/`xAxisIndex`/`yAxisIndex` scoping, …).

## Watching state from outside

Since the chart is driven by a `State<ChartOption>`, you can derive computed values from the same state using `computed()`:

```ts
import { toState, computed } from "@domphy/core"

const rawData = toState([120, 200, 150, 80])

const option = computed(() => ({
  xAxis: { type: "category", data: ["A", "B", "C", "D"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: rawData.get() }],
}))

// Chart auto-updates when rawData changes:
rawData.set([300, 150, 400, 100])
```
