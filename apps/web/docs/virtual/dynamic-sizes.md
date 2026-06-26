---
title: "Dynamic Sizes"
description: "Variable item heights and widths — measureElement lifecycle, estimateSize, resizeItem, initialMeasurementsCache, and scroll restoration with takeSnapshot."
---

# Dynamic Sizes

When every item has the same height, set `estimateSize: () => 40` and you are done. When items vary in size, the virtualizer starts from your estimate and refines each item after it renders.

## How measurement works

1. `estimateSize(index)` is called during layout. This happens before DOM render and sets initial positions.
2. After an item's DOM node mounts, you call `list.measureElement(node.domElement)` from its `_onMount`.
3. A `ResizeObserver` watches that element. When the browser reports its rendered size, the virtualizer stores the real value and re-lays out.
4. If the item later resizes (e.g. expanded/collapsed content), the `ResizeObserver` fires again automatically — no extra code needed.

## Basic variable-height list

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
import { themeColor, themeSpacing } from "@domphy/theme"

const items = Array.from({ length: 5_000 }, (_, i) => ({
  id: i,
  // Every 7th item has long text that wraps
  text: i % 7 === 0
    ? "A longer item that wraps across multiple lines and takes more vertical space than the others."
    : `Short item ${i}`,
}))

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: items.length,
  // Estimate must be your best guess — closer to reality means fewer layout jumps
  estimateSize: (i) => (i % 7 === 0 ? 80 : 40),
  overscan: 5,
})

const App = {
  div: [
    {
      div: (l) =>
        list.getVirtualItems(l).map((item) => ({
          _key: item.key,
          div: items[item.index].text,
          // Call measureElement — actual height replaces the estimate
          _onMount: (node) =>
            list.measureElement(node.domElement as HTMLDivElement),
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            // Do NOT set a fixed height — let content determine it
            transform: `translateY(${item.start}px)`,
            padding: themeSpacing(3),
            boxSizing: "border-box",
            borderBottom: (cl) => `1px solid ${themeColor(cl, "shift-3")}`,
          },
        })),
      style: {
        position: "relative",
        height: (l) => `${list.getTotalSize(l)}px`,
      },
    },
  ],
  _onMount: (node) =>
    list.setScrollElement(node.domElement as HTMLDivElement),
  _onRemove: () => list.destroy(),
  style: { height: "500px", overflowY: "auto" },
}
```

**Do not set a fixed `height` on items** when using `measureElement`. The measurement reads the actual rendered height; a hardcoded height would prevent the content from growing and make the measurement meaningless.

## estimateSize accuracy

A close estimate reduces layout shifts on initial render. If your items vary by predictable rules, encode those rules:

```ts
const list = createVirtualizer({
  count: posts.length,
  estimateSize: (index) => {
    const post = posts[index]
    // Rough guess: 48px base + ~20px per line at 60 chars
    const estimatedLines = Math.ceil(post.body.length / 60)
    return 48 + estimatedLines * 20
  },
})
```

Estimates are used only until the item is first rendered. After that, the virtualizer uses the real measured size.

## Padding around the list

Add space before the first item or after the last:

```ts
const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 48,
  paddingStart: 16,  // px of space before item 0
  paddingEnd: 32,    // px of space after the last item
})
```

`paddingStart` and `paddingEnd` are included in `getTotalSize()` and shift item positions accordingly.

## Gap between items

Uniform spacing between every item:

```ts
const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 48,
  gap: 8,  // 8px between each pair of items
})
```

The `gap` value is added to every item's `end` offset and flows into the total size.

## scrollPaddingStart / scrollPaddingEnd

When `scrollToIndex` computes the target offset, it adds these values to avoid hiding the item under a sticky header or toolbar:

```ts
const HEADER_HEIGHT = 64

const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 48,
  scrollPaddingStart: HEADER_HEIGHT,  // item will not land behind the header
  scrollPaddingEnd: 16,
})
```

## Programmatic resize

Override an item's size without waiting for a `ResizeObserver` cycle. Useful for expand/collapse:

```ts
import { toState } from "@domphy/core"

const expanded = toState(new Set<number>())

const COLLAPSED_HEIGHT = 48
const EXPANDED_HEIGHT = 200

function toggleItem(index: number) {
  const next = new Set(expanded.get())
  if (next.has(index)) {
    next.delete(index)
    list.virtualizer.resizeItem(index, COLLAPSED_HEIGHT)
  } else {
    next.add(index)
    list.virtualizer.resizeItem(index, EXPANDED_HEIGHT)
  }
  expanded.set(next)
}
```

`resizeItem(index, size)` updates the layout immediately. The `ResizeObserver` will confirm (or correct) the value once the DOM re-renders.

## useCachedMeasurements

When `useCachedMeasurements: true`, the virtualizer skips DOM reads and serves sizes straight from its internal `itemSizeCache`. This avoids redundant `ResizeObserver` callbacks after reorders where item content (and therefore size) has not changed:

```ts
const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 40,
  useCachedMeasurements: true,
})
```

Only enable this after items have been measured at least once. Until then the cache is empty and `estimateSize` is used as the fallback.

## initialMeasurementsCache

Pre-seed the measurement cache with known sizes from a previous session. Each entry must be a `VirtualItem` object (key, index, start, size, end, lane):

```ts
import type { VirtualItem } from "@domphy/virtual"

const saved: VirtualItem[] = JSON.parse(
  sessionStorage.getItem("listSizes") ?? "[]"
)

const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 48,
  initialMeasurementsCache: saved,
})
```

Items whose key is absent from the cache fall back to `estimateSize`.

## takeSnapshot and scroll restoration

`takeSnapshot()` returns the currently measured items as a plain `VirtualItem[]` array — suitable for `JSON.stringify` and passing back as `initialMeasurementsCache` on remount.

```ts
import type { VirtualItem } from "@domphy/virtual"
import { createVirtualizer } from "@domphy/virtual/domphy"

// Load saved state
const savedSnapshot: VirtualItem[] = JSON.parse(
  sessionStorage.getItem("snapshot") ?? "[]"
)
const savedOffset = Number(sessionStorage.getItem("scrollOffset") ?? "0")

const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 48,
  initialMeasurementsCache: savedSnapshot,
  initialOffset: savedOffset,
})

function saveScrollState() {
  const snapshot = list.virtualizer.takeSnapshot()
  const offset = list.virtualizer.getScrollOffset()
  sessionStorage.setItem("snapshot", JSON.stringify(snapshot))
  sessionStorage.setItem("scrollOffset", String(offset))
}

const App = {
  div: [
    {
      div: (l) =>
        list.getVirtualItems(l).map((item) => ({
          _key: item.key,
          div: items[item.index].title,
          _onMount: (node) =>
            list.measureElement(node.domElement as HTMLDivElement),
          style: {
            position: "absolute",
            top: 0,
            transform: `translateY(${item.start}px)`,
            width: "100%",
            padding: themeSpacing(3),
            boxSizing: "border-box",
          },
        })),
      style: {
        position: "relative",
        height: (l) => `${list.getTotalSize(l)}px`,
      },
    },
  ],
  _onMount: (node) =>
    list.setScrollElement(node.domElement as HTMLDivElement),
  _onRemove: () => {
    saveScrollState()
    list.destroy()
  },
  style: { height: "600px", overflowY: "auto" },
}
```

`takeSnapshot()` only includes items that have actually been measured (visible rows). Unmeasured items will re-use `estimateSize` on restore.

## Force full re-measurement

Call `list.virtualizer.measure()` to clear all cached sizes and re-measure every item from scratch. Useful after a global font-size or layout change:

```ts
document.addEventListener("fontSizeChange", () => {
  list.virtualizer.measure()
})
```
