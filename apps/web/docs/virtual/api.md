---
title: "API Reference"
description: "Virtualizer, createVirtualizer adapter, VirtualizerOptions, VirtualItem, and all methods."
---

# API Reference

## `createVirtualizer(options)` <Badge text="Domphy adapter" />

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
```

Returns a **reactive virtualizer handle**. Call inside a component body (not top-level module).

```ts
const list = createVirtualizer<HTMLDivElement, HTMLDivElement>(options)
```

### Handle methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getVirtualItems(l)` | `VirtualItem[]` | Reactive list of items currently in range. Pass a listener to subscribe. |
| `getTotalSize(l?)` | `number` | Total scroll size in px. Pass listener to subscribe reactively. |
| `setScrollElement(el)` | `void` | Wire the scroll container. Call from `_onMount`. |
| `measureElement(el)` | `void` | Measure an item element. Call from item `_onMount` for variable heights. |
| `scrollToIndex(i, opts?)` | `void` | Scroll to item at index. |
| `scrollToOffset(px, opts?)` | `void` | Scroll to an absolute offset. |
| `setOptions(opts)` | `void` | Update `count`, `estimateSize`, or other options reactively. |
| `version(l)` | `number` | Raw change counter — subscribe to know when any item changes. |
| `destroy()` | `void` | Detach resize observers. Call from `_onRemove`. |

The `virtualizer` property exposes the underlying `Virtualizer` instance with additional methods:

| Method | Description |
|--------|-------------|
| `scrollBy(delta, opts?)` | Scroll by a relative amount. |
| `scrollToEnd(opts?)` | Scroll to the end of the list. |
| `takeSnapshot()` | Capture current offsets for later restore. |
| `getDistanceFromEnd()` | Pixels from current scroll position to the end. |
| `isAtEnd(threshold?)` | `true` if within `threshold` (default `0`) px of the end. |

---

## `VirtualizerOptions`

```ts
interface VirtualizerOptions<TScrollElement, TItemElement> {
  // Required
  count: number                          // total item count
  estimateSize: (index: number) => number  // item height/width estimate in px

  // Scroll element
  getScrollElement?: () => TScrollElement | null
  observeElementRect?: (instance, callback) => () => void
  observeElementOffset?: (instance, callback) => () => void
  scrollToFn?: (offset, options, instance) => void

  // Layout
  horizontal?: boolean                   // default false (vertical)
  paddingStart?: number                  // px before first item
  paddingEnd?: number                    // px after last item
  gap?: number                           // px gap between items

  // Range control
  overscan?: number                      // extra items beyond visible (default 1)
  rangeExtractor?: (range: Range) => number[]
  initialRect?: { width: number; height: number }
  initialOffset?: number | (() => number)

  // Key extraction
  getItemKey?: (index: number) => Key

  // Dynamic measurement
  measureElement?: (el: TItemElement, entry: ResizeObserverEntry | undefined, instance: Virtualizer<TScrollElement, TItemElement>) => number
  scrollMargin?: number

  // Scroll anchoring
  followOnAppend?: "ancestor" | "anchor"
  scrollAnchor?: "start" | "end"
  isRtl?: boolean

  // Lanes (masonry)
  lanes?: number
  laneAssignmentMode?: "sequential" | "shortest"

  // Performance
  useCachedMeasurements?: boolean

  // Callbacks
  onChange?: (instance: Virtualizer<TScrollElement, TItemElement>, sync: boolean) => void
  debug?: boolean
}
```

---

## `VirtualItem`

```ts
interface VirtualItem {
  key: Key                 // stable key (getItemKey result or index)
  index: number            // 0-based position in data
  start: number            // px offset from the start of the list (absolute position)
  end: number              // start + size
  size: number             // measured or estimated height/width
  lane: number             // for multi-lane masonry layouts (default: 0)
}
```

Use `start` to `position: absolute` + `translateY` (vertical) or `translateX` / `left` (horizontal).

---

## `Range`

```ts
interface Range {
  startIndex: number      // first visible item index
  endIndex: number        // last visible item index
  overscan: number        // configured overscan value
  count: number           // total item count
}
```

Passed to `rangeExtractor` — return an array of indexes to render.

---

## `ScrollToOptions`

```ts
interface ScrollToOptions {
  align?: "start" | "center" | "end" | "auto"   // default "auto"
  behavior?: "auto" | "smooth"                  // default "auto"
}
```

`"auto"` alignment moves the viewport the minimum distance needed to bring the item into view.

---

## `Virtualizer` class (low-level)

Import directly when not using the Domphy adapter:

```ts
import { Virtualizer } from "@domphy/virtual"
```

```ts
const virtualizer = new Virtualizer(options)
virtualizer._didMount()

// In your render loop
const items = virtualizer.getVirtualItems()
const totalSize = virtualizer.getTotalSize()

// Cleanup
virtualizer.cleanup()
```

### Additional methods on `Virtualizer`

| Method | Description |
|--------|-------------|
| `getMeasurements()` | All measurements (index → Rect). |
| `calculateRange()` | Recalculate the current visible range. |
| `getVirtualIndexes()` | Just the indexes (lighter than full VirtualItems). |
| `getVirtualItemForOffset(px)` | Find the item at a given scroll offset. |
| `getSize()` | Container viewport size. |
| `getScrollOffset()` | Current scroll offset. |
| `getMaxScrollOffset()` | Maximum scrollable offset. |
| `resizeItem(index, size)` | Programmatically override an item's measured size. |
| `scrollToIndex(i, opts?)` | Scroll to item. |
| `scrollToOffset(px, opts?)` | Scroll to absolute offset. |
| `scrollBy(delta, opts?)` | Relative scroll. |
| `scrollToEnd(opts?)` | Scroll to the last item. |
| `getDistanceFromEnd()` | Distance from current position to end. |
| `isAtEnd(threshold?)` | True if at/near the end. |
| `getOffsetForIndex(i, align?)` | Compute target scroll offset for an item. |
| `getOffsetForAlignment(align, size)` | Offset for a given alignment + size. |
| `takeSnapshot()` | Capture current item offsets. |
| `measure()` | Force re-measurement of all items. |
| `indexFromElement(el)` | Get item index from a DOM element. |

---

## Low-level helpers

```ts
import {
  observeElementRect,
  observeWindowRect,
  observeElementOffset,
  observeWindowOffset,
  measureElement,
  elementScroll,
  windowScroll,
  defaultRangeExtractor,
  defaultKeyExtractor,
} from "@domphy/virtual"
```

| Helper | Description |
|--------|-------------|
| `observeElementRect` | ResizeObserver-based rect tracker for a DOM element. |
| `observeWindowRect` | Tracks `window.innerWidth/Height`. |
| `observeElementOffset` | Scroll-event-based offset tracker for a DOM element. |
| `observeWindowOffset` | Tracks `window.scrollX/Y`. |
| `measureElement` | Default measurement strategy (uses `offsetHeight`/`offsetWidth`). |
| `elementScroll` | Default scroll function for a DOM element. |
| `windowScroll` | Scroll function for the browser window. |
| `defaultRangeExtractor` | Standard range calculation. Pass to `rangeExtractor` as a base. |
| `defaultKeyExtractor` | Returns item index as the key. |
