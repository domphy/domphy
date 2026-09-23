---
title: "ChartEngine API"
description: "Advanced chart embedding with ChartEngine — manual init, resize, option updates, and destroy in @domphy/chart."
---

# ChartEngine API

`ChartEngine` is the low-level class that `chart()` patch wraps. Use it directly when you need manual lifecycle control, resize observers, or multi-chart orchestration.

## Basic usage

```ts
import { ChartEngine } from "@domphy/chart"
import type { ChartOption } from "@domphy/chart"

const container = document.getElementById("chart")!
container.style.position = "relative"

const engine = new ChartEngine(container)
await engine.init()

engine.setSize(600, 300)
engine.setOption({
  xAxis: { type: "category", data: ["A", "B", "C"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: [10, 20, 15] }],
})
```

## API reference

### `new ChartEngine(container)`

Creates a chart engine bound to `container`. Does not start WebGL until `init()` is called.

```ts
const engine = new ChartEngine(container: HTMLElement)
```

### `engine.init()`

Initializes the WebGL context, creates the canvas and SVG overlay layers. Returns a `Promise<void>`.

```ts
await engine.init()
```

Must be called before `setSize()` or `setOption()`.

### `engine.setSize(width, height)`

Sets the chart dimensions in pixels and resizes all internal layers.

```ts
engine.setSize(width: number, height: number): void
```

Call this after `init()` and whenever the container size changes.

### `engine.setOption(option)`

Updates the chart with a new option object. Performs a full re-render.

```ts
engine.setOption(option: ChartOption): void
```

Subsequent calls replace the previous option entirely.

### `engine.on(event, handler)` / `engine.off(event, handler?)`

Subscribes to a chart event. The only event today is `"click"`; the handler receives the `TooltipParams` of the data item under the cursor and nothing fires when the click lands on empty space. `on()` returns an unsubscribe function; `off()` without a handler drops every handler for that event.

```ts
const stop = engine.on("click", (params) => console.log(params.seriesName, params.value))
stop()
```

### `engine.destroy()`

Tears down the WebGL context, removes all DOM elements, and releases memory.

```ts
engine.destroy(): void
```

Always call this when the chart is removed from the DOM.

## Accessibility and context loss

The WebGL canvas is `aria-hidden` (its pixels carry no accessible text), so the SVG overlay above it is the chart's accessible object: `role="img"` with an `aria-label` built from `option.title` when there is one, otherwise from the series types and names actually rendered.

A WebGL context is not permanent — the browser drops it on a GPU reset, under memory pressure, and once a page passes the per-page context limit (~16 in Chrome, reachable with a dashboard of charts). The engine listens for `webglcontextlost`, prevents the default (which would make the loss permanent), drops the dead GPU resources, and rebuilds itself on `webglcontextrestored` — including a fresh canvas, because luma.gl caches compiled pipelines per device. No application code is needed.

## With ResizeObserver

```ts
const engine = new ChartEngine(container)
await engine.init()

const observer = new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect
  engine.setSize(width, height)
})
observer.observe(container)

engine.setOption(option)

// Cleanup:
observer.disconnect()
engine.destroy()
```

## With Domphy lifecycle

Manual embedding inside `_onMount` / `_onRemove`:

```ts
import { ChartEngine } from "@domphy/chart"

const MyChart: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "300px", position: "relative" },
  _onMount: async (node) => {
    const engine = new ChartEngine(node.domElement as HTMLElement)
    await engine.init()
    const { width, height } = node.domElement!.getBoundingClientRect()
    engine.setSize(width || 600, height || 300)
    engine.setOption({ series: [{ type: "line", data: [1, 2, 3] }] })
    node.setMetadata("engine", engine)
  },
  _onRemove: (node) => {
    (node.getMetadata("engine") as ChartEngine | undefined)?.destroy()
  },
}
```

## Scale utilities

```ts
import {
  createLinearScale,
  createOrdinalScale,
  createTimeScale,
  createLogScale,
} from "@domphy/chart"

// Linear: maps numeric domain to pixel range
const scale = createLinearScale([0, 100], [0, 400])
scale.map(50)   // → 200
scale.invert(200)  // → 50

// Ordinal: maps category labels to pixel range (center of each band)
const ordinal = createOrdinalScale(["A", "B", "C"], [0, 300])
ordinal.map("B")  // → 150

// Time: like linear but domain values are timestamps
const time = createTimeScale([Date.UTC(2024, 0, 1), Date.UTC(2024, 11, 31)], [0, 600])
time.map(Date.UTC(2024, 5, 15))

// Log: logarithmic scale, domain must not cross zero
const log = createLogScale([1, 1000], [0, 300])
log.map(10)   // → 100  (log₁₀(10)/log₁₀(1000) × 300)
```

All four return a scale object (`map` / `invert` / `ticks` / `bandwidth` / `format`) — not a callable `(value) => number`. Used internally by the engine; public for custom overlays.
