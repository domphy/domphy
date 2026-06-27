---
title: "Scroll Navigation"
description: "scrollToIndex, scrollToOffset, scrollBy, scrollToEnd — alignment modes, smooth scroll, keyboard navigation, and checking scroll position."
---

# Scroll Navigation

`@domphy/virtual` exposes four imperative scroll methods. The `createVirtualizer` handle forwards `scrollToIndex` and `scrollToOffset` directly; the remaining methods live on `handle.virtualizer`.

## scrollToIndex

Scroll to bring item `index` into view.

```ts
list.scrollToIndex(index: number, options?: {
  align?:    "start" | "center" | "end" | "auto"
  behavior?: "auto"  | "smooth"  | "instant"
})
```

| `align` | Result |
|---------|--------|
| `"start"` | Item's leading edge aligns with the viewport start |
| `"center"` | Item is centered in the viewport |
| `"end"` | Item's trailing edge aligns with the viewport end |
| `"auto"` *(default)* | Minimum movement — no-op if item is already visible |

`behavior` maps directly to the browser's `ScrollBehavior`:
- `"auto"` — browser default (usually instant)
- `"smooth"` — animated scroll
- `"instant"` — always instant regardless of browser setting

```ts
// Jump to the first item
list.scrollToIndex(0)

// Center item 500 with smooth animation
list.scrollToIndex(500, { align: "center", behavior: "smooth" })

// Bring item 9999 just into view with minimum movement
list.scrollToIndex(9999, { align: "auto" })
```

### Scroll on mount

Restore a saved index when the container mounts:

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
import { themeColor, themeSpacing } from "@domphy/theme"

const SAVED_INDEX = 250

const rows = Array.from({ length: 10_000 }, (_, i) => `Row #${i + 1}`)

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: rows.length,
  estimateSize: () => 40,
  overscan: 5,
})

const App = {
  div: [
    {
      div: (l) =>
        list.getVirtualItems(l).map((item) => ({
          div: rows[item.index],
          _key: item.key,
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${item.size}px`,
            transform: `translateY(${item.start}px)`,
            paddingInline: themeSpacing(3),
            display: "flex",
            alignItems: "center",
            borderBottom: (cl) => `1px solid ${themeColor(cl, "shift-3")}`,
          },
        })),
      style: {
        position: "relative",
        height: (l) => `${list.getTotalSize(l)}px`,
      },
    },
  ],
  _onMount: (node) => {
    list.setScrollElement(node.domElement as HTMLDivElement)
    // scrollToIndex after wiring — virtualizer needs the scroll element first
    list.scrollToIndex(SAVED_INDEX, { align: "start" })
  },
  _onRemove: () => list.destroy(),
  style: { height: "400px", overflowY: "auto" },
}
```

## scrollToOffset

Scroll to an absolute pixel offset from the start of the list.

```ts
list.scrollToOffset(px: number, options?: {
  align?:    "start" | "center" | "end" | "auto"
  behavior?: "auto" | "smooth" | "instant"
})
```

```ts
// Jump to 3000px
list.scrollToOffset(3000)

// Smooth scroll to the midpoint
const mid = list.virtualizer.getTotalSize() / 2
list.scrollToOffset(mid, { behavior: "smooth" })

// Scroll to top
list.scrollToOffset(0)
```

## scrollBy

Scroll a relative amount from the current position. Lives on `handle.virtualizer`.

```ts
list.virtualizer.scrollBy(delta: number, options?: {
  behavior?: "auto" | "smooth" | "instant"
})
```

Positive `delta` scrolls forward (down/right), negative scrolls backward.

```ts
// Page down by 600px
list.virtualizer.scrollBy(600)

// Page up, smooth
list.virtualizer.scrollBy(-600, { behavior: "smooth" })
```

## scrollToEnd

Scroll to the last item. Lives on `handle.virtualizer`.

```ts
list.virtualizer.scrollToEnd(options?: {
  behavior?: "auto" | "smooth" | "instant"
})
```

```ts
// Jump to bottom
list.virtualizer.scrollToEnd()

// Smooth scroll to bottom
list.virtualizer.scrollToEnd({ behavior: "smooth" })
```

When `count > 0`, this is equivalent to `scrollToIndex(count - 1, { align: "end" })`.

## Checking scroll position

### isAtEnd

```ts
list.virtualizer.isAtEnd(threshold?: number): boolean
```

Returns `true` when the scroll offset is within `threshold` pixels of the maximum (default `0` — exactly at the end). Use it to trigger pagination or show/hide a "scroll to bottom" button:

```ts
import { effect, toState } from "@domphy/core"

const showScrollButton = toState(false)

effect(() => {
  // version() without a listener still tracks in effect context
  list.version()
  showScrollButton.set(!list.virtualizer.isAtEnd(80))
})
```

### getDistanceFromEnd

```ts
list.virtualizer.getDistanceFromEnd(): number
```

Pixels remaining between the current scroll offset and the maximum scroll position.

```ts
const dist = list.virtualizer.getDistanceFromEnd()
if (dist < 200) {
  loadMoreItems()
}
```

### getOffsetForIndex

Compute the target offset without scrolling — useful to determine whether a scroll is needed before firing:

```ts
const result = list.virtualizer.getOffsetForIndex(index, "start")
// result is [offsetPx, alignUsed] | undefined
if (result) {
  const [offset] = result
  console.log(`Item ${index} would scroll to ${offset}px`)
}
```

Returns `undefined` for out-of-bounds indexes.

## Keyboard navigation

Combine `scrollToIndex` with a `keydown` listener for accessible list navigation:

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
import { toState } from "@domphy/core"

const rows = Array.from({ length: 1000 }, (_, i) => `Item ${i}`)
const activeIndex = toState(0)

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: rows.length,
  estimateSize: () => 40,
  overscan: 3,
})

const App = {
  div: [
    {
      div: (l) =>
        list.getVirtualItems(l).map((item) => ({
          div: rows[item.index],
          _key: item.key,
          style: {
            position: "absolute",
            top: 0,
            height: `${item.size}px`,
            transform: `translateY(${item.start}px)`,
            background: (cl) =>
              item.index === activeIndex.get(cl)
                ? themeColor(cl, "primary-2")
                : "transparent",
            paddingInline: themeSpacing(3),
            display: "flex",
            alignItems: "center",
          },
        })),
      style: {
        position: "relative",
        height: (l) => `${list.getTotalSize(l)}px`,
      },
    },
  ],
  _onMount: (node) => {
    list.setScrollElement(node.domElement as HTMLDivElement)
    node.domElement.addEventListener("keydown", (e: KeyboardEvent) => {
      const cur = activeIndex.get()
      if (e.key === "ArrowDown") {
        const next = Math.min(cur + 1, rows.length - 1)
        activeIndex.set(next)
        list.scrollToIndex(next, { align: "auto" })
        e.preventDefault()
      } else if (e.key === "ArrowUp") {
        const prev = Math.max(cur - 1, 0)
        activeIndex.set(prev)
        list.scrollToIndex(prev, { align: "auto" })
        e.preventDefault()
      }
    })
  },
  _onRemove: () => list.destroy(),
  tabIndex: 0,
  style: {
    height: "400px",
    overflowY: "auto",
    outline: "none",
    position: "relative",
  },
}
```

## "Back to top" button

```ts
import { toState } from "@domphy/core"

const scrollOffset = toState(0)

// Subscribe to scroll changes via version()
effect(() => {
  list.version()
  scrollOffset.set(list.virtualizer.getScrollOffset())
})

const BackToTop = {
  button: "Back to top",
  onClick: () => list.scrollToIndex(0, { align: "start", behavior: "smooth" }),
  style: {
    display: (l) => (scrollOffset.get(l) > 300 ? "block" : "none"),
    position: "fixed",
    bottom: themeSpacing(4),
    right: themeSpacing(4),
  },
}
```
