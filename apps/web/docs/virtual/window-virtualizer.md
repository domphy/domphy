---
title: "Window Virtualizer"
description: "Virtualize content that scrolls with the browser window rather than a fixed-height container."
---

# Window Virtualizer

By default, `createVirtualizer` virtualizes items inside a fixed-height scrollable `div`. When your content should scroll with the browser window (the whole page scrolls), use the window-specific helpers instead.

## Setup

Import the window observers and scroll function from `@domphy/virtual`:

```ts
import {
  observeWindowRect,
  observeWindowOffset,
  windowScroll,
} from "@domphy/virtual"
import { createVirtualizer } from "@domphy/virtual/domphy"
```

Pass them as options, then wire `window` as the scroll element from `_onMount`:

```ts
const list = createVirtualizer({
  count: rows.length,
  estimateSize: () => 50,
  observeElementRect: observeWindowRect as any,
  observeElementOffset: observeWindowOffset as any,
  scrollToFn: windowScroll as any,
  overscan: 5,
})

// In the container element:
_onMount: () => list.setScrollElement(window as any)
```

The `as any` casts are needed because the `createVirtualizer` generic constrains `TScroll extends Element`, while `window` is a `Window`. The runtime behaviour is correct — the `Window` overloads in the virtualizer core handle all window-specific reads.

## Full example

```ts
import { observeWindowRect, observeWindowOffset, windowScroll } from "@domphy/virtual"
import { createVirtualizer } from "@domphy/virtual/domphy"
import { themeColor, themeSpacing } from "@domphy/theme"

const rows = Array.from({ length: 10_000 }, (_, i) => `Row ${i + 1}`)

const list = createVirtualizer({
  count: rows.length,
  estimateSize: () => 52,
  observeElementRect: observeWindowRect as any,
  observeElementOffset: observeWindowOffset as any,
  scrollToFn: windowScroll as any,
  overscan: 5,
})

const App = {
  // No fixed height — the document height equals the spacer height
  div: [
    {
      div: (l) =>
        list.getVirtualItems(l).map((item) => ({
          _key: item.key,
          div: rows[item.index],
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${item.size}px`,
            transform: `translateY(${item.start}px)`,
            display: "flex",
            alignItems: "center",
            paddingInline: themeSpacing(3),
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
  _onMount: () => list.setScrollElement(window as any),
  _onRemove: () => list.destroy(),
}
```

**Key differences from element-based virtualization:**

| Aspect | Element container | Window |
|--------|-------------------|--------|
| Container height | Fixed (e.g. `600px`) | Not set — page scrolls |
| Scroll element | `node.domElement` | `window` |
| Rect observer | `observeElementRect` | `observeWindowRect` |
| Offset observer | `observeElementOffset` | `observeWindowOffset` |
| Scroll function | `elementScroll` | `windowScroll` |

## scrollMargin

When the virtual list starts below the top of the page (e.g. after a fixed header), set `scrollMargin` to the header height. This shifts all `item.start` values so they are relative to the document top, not the list container top:

```ts
const HEADER_HEIGHT = 64

const list = createVirtualizer({
  count: rows.length,
  estimateSize: () => 52,
  scrollMargin: HEADER_HEIGHT,  // items begin 64px from the document top
  observeElementRect: observeWindowRect as any,
  observeElementOffset: observeWindowOffset as any,
  scrollToFn: windowScroll as any,
})

const App = {
  div: [
    // Fixed header — not part of the virtual list
    {
      header: "My App",
      style: {
        position: "sticky",
        top: 0,
        height: `${HEADER_HEIGHT}px`,
        background: (cl) => themeColor(cl, "surface"),
        zIndex: 10,
        borderBottom: (cl) => `1px solid ${themeColor(cl, "shift-3")}`,
        display: "flex",
        alignItems: "center",
        paddingInline: themeSpacing(4),
      },
    },
    // Virtual list body
    {
      div: [
        {
          div: (l) =>
            list.getVirtualItems(l).map((item) => ({
              _key: item.key,
              div: rows[item.index],
              style: {
                position: "absolute",
                top: 0,
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
                width: "100%",
                paddingInline: themeSpacing(3),
                display: "flex",
                alignItems: "center",
                boxSizing: "border-box",
              },
            })),
          style: {
            position: "relative",
            height: (l) => `${list.getTotalSize(l)}px`,
          },
        },
      ],
      _onMount: () => list.setScrollElement(window as any),
      _onRemove: () => list.destroy(),
    },
  ],
}
```

## Variable heights with window scroll

`measureElement` works identically with window scroll:

```ts
const list = createVirtualizer({
  count: posts.length,
  estimateSize: () => 80,
  observeElementRect: observeWindowRect as any,
  observeElementOffset: observeWindowOffset as any,
  scrollToFn: windowScroll as any,
})

// Attach measureElement to each item:
const PostItem = (item: VirtualItem) => ({
  _key: item.key,
  article: PostContent(posts[item.index]),
  _onMount: (node) =>
    list.measureElement(node.domElement as HTMLElement),
  style: {
    position: "absolute",
    top: 0,
    width: "100%",
    transform: `translateY(${item.start}px)`,
  },
})
```

## scrollToIndex and scrollToOffset

Both methods work the same. The underlying `windowScroll` function calls `window.scrollTo`:

```ts
// Scroll to item 1000, smooth
list.scrollToIndex(1000, { align: "start", behavior: "smooth" })

// Jump to top of page
list.scrollToOffset(0)
```

## iOS WebKit

On iOS, writing `scrollTop` during a momentum scroll cancels the in-flight inertia. `@domphy/virtual` detects iOS WebKit automatically via `navigator.userAgent` and defers scroll-position corrections (triggered by dynamic item size changes) until the scroll settles completely — no configuration required. This applies to both element and window scroll modes.
