---
title: "Usage Patterns"
description: "Variable sizes, window scroll, horizontal lists, sticky ranges, and overscan."
---

# Usage Patterns

## Variable heights (dynamic measurement)

When item heights differ, pass `estimateSize` as a best guess and wire `measureElement` so the virtualizer measures each item after render.

```ts
import { Virtualizer } from "@domphy/virtual"
import { createVirtualizer } from "@domphy/virtual/domphy"
import { toState } from "@domphy/core"

const data = toState(Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  text: i % 5 === 0 ? "A longer item that wraps to multiple lines." : "Short",
})))

const list = createVirtualizer({
  count: 10_000,
  estimateSize: () => 40,   // initial guess in px — refined on measure
  overscan: 5,
})

const App = {
  div: {
    // scroll container — fixed height
    div: [
      {
        // spacer — holds the total scroll height
        div: null,
        style: { height: () => `${list.getTotalSize()}px`, position: "relative" },
        div: (l) => list.getVirtualItems(l).map((item) => ({
          div: data.get()[item.index].text,
          _key: item.key,
          _onMount: (node) => list.measureElement(node.domElement),
          style: {
            position: "absolute",
            top: 0,
            transform: `translateY(${item.start}px)`,
            width: "100%",
          },
        })),
      },
    ],
    _onMount: (node) => list.setScrollElement(node.domElement),
    _onRemove: () => list.destroy(),
    style: { height: "600px", overflow: "auto" },
  },
}
```

`measureElement` replaces the estimate with the actual rendered height and schedules a re-layout.

## Window scroll

Virtualize against the browser window instead of a container. Use `observeWindowRect` and `observeWindowOffset` options:

```ts
import { observeWindowRect, observeWindowOffset, windowScroll } from "@domphy/virtual"
import { createVirtualizer } from "@domphy/virtual/domphy"

const list = createVirtualizer({
  count: 5000,
  estimateSize: () => 50,
  getScrollElement: () => typeof window !== "undefined" ? window : null,
  observeElementRect: observeWindowRect,
  observeElementOffset: observeWindowOffset,
  scrollToFn: windowScroll,
})

const App = {
  div: {
    // No fixed height on outer container — page scrolls naturally
    div: {
      div: (l) => list.getVirtualItems(l).map((item) => ({
        div: `Row ${item.index}`,
        _key: item.key,
        style: {
          position: "absolute",
          top: `${item.start}px`,
          height: `${item.size}px`,
        },
      })),
      style: { position: "relative", height: () => `${list.getTotalSize()}px` },
    },
    _onMount: () => list.setScrollElement(window as any),
    _onRemove: () => list.destroy(),
  },
}
```

## Horizontal virtualization

Swap the scroll axis with `horizontal: true`. Items are positioned by `start` along the x-axis:

```ts
const list = createVirtualizer({
  count: 500,
  estimateSize: () => 120,   // column width
  horizontal: true,
  overscan: 3,
})

const App = {
  div: {
    // flex row inside a horizontally scrollable container
    div: {
      div: (l) => list.getVirtualItems(l).map((item) => ({
        div: `Col ${item.index}`,
        _key: item.key,
        style: {
          position: "absolute",
          left: `${item.start}px`,
          width: `${item.size}px`,
          height: "100%",
        },
      })),
      style: {
        position: "relative",
        width: () => `${list.getTotalSize()}px`,
        height: "100%",
      },
    },
    _onMount: (node) => list.setScrollElement(node.domElement),
    _onRemove: () => list.destroy(),
    style: { width: "800px", height: "60px", overflowX: "auto", overflowY: "hidden" },
  },
}
```

## Overscan

`overscan` (default `1`) controls how many items beyond the visible viewport to render. Higher values reduce blank-flash on fast scroll at the cost of rendering more items:

```ts
const list = createVirtualizer({
  count: 10_000,
  estimateSize: () => 40,
  overscan: 10,   // render 10 extra items before and after the visible range
})
```

For very fast scrollers or touch inertia, `overscan: 5–15` is typical.

## Sticky items (range extractor)

Implement sticky headers with a custom `rangeExtractor`. The default extractor returns `startIndex..endIndex` — extend it to prepend section-header indexes:

```ts
import { defaultRangeExtractor } from "@domphy/virtual"

const sectionHeaders = new Set([0, 50, 100, 150])   // item indexes that are headers

const list = createVirtualizer({
  count: 200,
  estimateSize: () => 40,
  rangeExtractor: (range) => {
    const active = [...sectionHeaders].filter((i) => i <= range.startIndex)
    const last = active[active.length - 1]
    const defaults = defaultRangeExtractor(range)
    return last !== undefined && !defaults.includes(last)
      ? [last, ...defaults]
      : defaults
  },
})
```

Render the sticky header item with `position: sticky; top: 0` and a higher `z-index` than regular rows.

## Scroll to index on load

Scroll to an item after mounting (e.g. restore a saved position):

```ts
const App = {
  div: {
    // scroll container...
    _onMount: (node) => {
      list.setScrollElement(node.domElement)
      list.scrollToIndex(savedIndex, { align: "start", behavior: "auto" })
    },
  },
}
```

`align` options: `"start"` | `"center"` | `"end"` | `"auto"` (smallest movement).

## Follow on append (infinite scroll)

Use `followOnAppend: "anchor"` to keep the viewport anchored at the bottom as new items are added — useful for chat messages, live feeds:

```ts
const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 48,
  followOnAppend: "anchor",    // viewport stays at bottom when count grows
  scrollAnchor: "end",
})
```

When the user scrolls up, the anchor is released until they scroll back to the bottom.

## Virtualized grid (2D)

For a fixed-column grid, compose two virtualizers — one for rows, one for columns:

```ts
const rowList = createVirtualizer({ count: rowCount, estimateSize: () => 50, horizontal: false })
const colList = createVirtualizer({ count: colCount, estimateSize: () => 120, horizontal: true })

const App = {
  div: {
    div: {
      div: (l) => rowList.getVirtualItems(l).map((row) => ({
        _key: row.key,
        div: (l) => colList.getVirtualItems(l).map((col) => ({
          div: `${row.index},${col.index}`,
          _key: col.key,
          style: {
            position: "absolute",
            left: `${col.start}px`,
            width: `${col.size}px`,
            height: `${row.size}px`,
          },
        })),
        style: {
          position: "absolute",
          top: `${row.start}px`,
          left: 0,
          height: `${row.size}px`,
          width: () => `${colList.getTotalSize()}px`,
        },
      })),
      style: {
        position: "relative",
        height: () => `${rowList.getTotalSize()}px`,
        width: () => `${colList.getTotalSize()}px`,
      },
    },
    _onMount: (node) => {
      rowList.setScrollElement(node.domElement)
      colList.setScrollElement(node.domElement)
    },
    _onRemove: () => { rowList.destroy(); colList.destroy() },
    style: { height: "600px", width: "100%", overflow: "auto" },
  },
}
```
