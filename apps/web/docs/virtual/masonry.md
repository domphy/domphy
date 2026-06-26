---
title: "Masonry Layout"
description: "Multi-lane masonry grids using the lanes option and laneAssignmentMode."
---

# Masonry Layout

A masonry layout places items into multiple columns (lanes), putting each new item into the shortest lane. `@domphy/virtual` supports this natively via the `lanes` option — the same virtualizer that powers plain lists handles multi-lane layouts.

## Basic setup

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"

const LANE_COUNT = 3

const photos = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  height: 150 + (i * 37 % 200),  // deterministic variable heights
  alt: `Photo ${i}`,
}))

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: photos.length,
  estimateSize: (i) => photos[i].height,
  lanes: LANE_COUNT,
  gap: 12,
  overscan: 3,
})
```

With `lanes > 1`, each `VirtualItem` gains a `lane` property — a zero-based column index (`0` to `lanes - 1`).

## Positioning items

`item.start` is the vertical offset within the item's lane. The horizontal position depends on the lane index and the available container width.

Compute the column width from the container's actual width, accounting for the gaps between lanes:

```ts
// columnWidth = (containerWidth - gap * (lanes - 1)) / lanes
const columnWidth = (containerWidth - GAP * (LANE_COUNT - 1)) / LANE_COUNT

// Horizontal position for lane N:
const left = item.lane * (columnWidth + GAP)
```

## Full example

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
import { toState } from "@domphy/core"
import { themeColor, themeSpacing } from "@domphy/theme"

const LANE_COUNT = 3
const GAP = 12

const photos = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  height: 150 + (i * 37 % 200),
  label: `Photo ${i}`,
}))

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: photos.length,
  estimateSize: (i) => photos[i].height,
  lanes: LANE_COUNT,
  gap: GAP,
  overscan: 3,
})

const containerWidth = toState(0)

const App = {
  div: [
    {
      div: (l) => {
        const totalSize = list.getTotalSize(l)
        const items = list.getVirtualItems(l)
        const width = containerWidth.get(l)
        const columnWidth =
          width > 0
            ? (width - GAP * (LANE_COUNT - 1)) / LANE_COUNT
            : 0

        return {
          div: items.map((item) => ({
            _key: item.key,
            div: {
              // Photo placeholder
              div: photos[item.index].label,
              style: {
                width: "100%",
                height: `${photos[item.index].height}px`,
                background: (cl) => themeColor(cl, "shift-2"),
                borderRadius: themeSpacing(2),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: (cl) => themeColor(cl, "shift-7"),
              },
            },
            _onMount: (node) =>
              list.measureElement(node.domElement as HTMLDivElement),
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: `${columnWidth}px`,
              // Combine lane offset and vertical position in one transform
              transform: `translateX(${
                item.lane * (columnWidth + GAP)
              }px) translateY(${item.start}px)`,
            },
          })),
          style: {
            position: "relative",
            height: `${totalSize}px`,
          },
        }
      },
    },
  ],
  _onMount: (node) => {
    list.setScrollElement(node.domElement as HTMLDivElement)
    // Track container width so column sizing stays accurate on resize
    const ro = new ResizeObserver(() => {
      containerWidth.set((node.domElement as HTMLDivElement).offsetWidth)
    })
    ro.observe(node.domElement as HTMLDivElement)
    containerWidth.set((node.domElement as HTMLDivElement).offsetWidth)
  },
  _onRemove: () => list.destroy(),
  style: { height: "700px", overflowY: "auto", position: "relative" },
}
```

## laneAssignmentMode

Controls when the virtualizer assigns an item to a lane.

```ts
type LaneAssignmentMode = "estimate" | "measured"
```

| Mode | When lane is assigned | Trade-off |
|------|-----------------------|-----------|
| `"estimate"` *(default)* | When `estimateSize` is called, before DOM render | Fast, but items may shift lanes once actual sizes arrive |
| `"measured"` | After `measureElement` reports the real size | Stable placement, but items appear in order of measurement |

```ts
const list = createVirtualizer({
  count: photos.length,
  estimateSize: () => 200,  // rough guess
  lanes: 3,
  laneAssignmentMode: "measured",  // wait for real sizes before assigning
})
```

Use `"measured"` when placement consistency matters more than immediate layout — for example, a photo gallery where users expect items to stay in the same column across scrolls.

## VirtualItem.lane

The `lane` field on each `VirtualItem` is a zero-based integer:

```ts
const items = list.virtualizer.getVirtualItems()
for (const item of items) {
  console.log(`Item ${item.index} → lane ${item.lane}, top ${item.start}px`)
}
```

With `lanes: 1` (the default), `lane` is always `0`.

## Horizontal masonry

Swap `horizontal: true` and `lanes` for a row-based masonry. `item.start` becomes the horizontal offset; `item.lane` selects the row:

```ts
const list = createVirtualizer({
  count: items.length,
  estimateSize: () => 120,  // item width estimate
  lanes: 3,
  horizontal: true,
  gap: 8,
})

// item position:
// left  = item.start (px along the x-axis)
// top   = item.lane  * (rowHeight + gap)
```

## Performance notes

- Always use `measureElement` with masonry — natural content heights are the whole point. Without it every item uses `estimateSize` and the layout collapses to evenly spaced rows.
- `gap` applies uniformly between items within each lane.
- Keep `overscan` between `2` and `5`. Items in different lanes sit at different vertical positions, so the visible range covers more items than in a single-lane list.
- For large counts with unpredictable heights, set a realistic `estimateSize` to minimize reflow on first render.
