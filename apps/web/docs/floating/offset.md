---
title: "offset"
description: "Translate the floating element along the main or cross axis."
---

# offset

`offset` translates the floating element away from (or toward) the reference element. It is almost always the first middleware in the array.

```ts
import { computePosition, offset } from "@domphy/floating"

computePosition(reference, floating, {
  placement: "top",
  middleware: [offset(8)],
})
```

## Simple Number

Pass a number to add a gap on the **main axis** — the axis that runs perpendicular to the reference edge.

```ts
offset(8)    // 8px gap between reference and floating
offset(0)    // no gap (same as default)
offset(-4)   // 4px overlap
```

## Object Options

Pass an object for fine-grained control:

```ts
offset({
  mainAxis: 8,          // gap away from the reference edge
  crossAxis: 0,         // sideways shift (default 0)
  alignmentAxis: null,  // override for aligned placements (default null)
})
```

### `mainAxis`

Distance along the axis that points away from the reference edge. For `"top"` or `"bottom"` this is the vertical gap; for `"left"` or `"right"` it is the horizontal gap.

```ts
// 12px above the reference when placement is "top"
offset({ mainAxis: 12 })
```

### `crossAxis`

Sideways shift along the alignment axis. Positive values move the floating element toward the `end` of the alignment axis.

```ts
// 8px to the right for placement "top" or "bottom"
offset({ crossAxis: 8 })

// Combined: gap + sideways
offset({ mainAxis: 8, crossAxis: -4 })
```

### `alignmentAxis`

Applies only to `start`- or `end`-aligned placements (`"top-start"`, `"bottom-end"`, etc.) and overrides `crossAxis` for those placements. Inverts direction for `"end"` alignments.

```ts
// For "top-start": shift 4px away from the start edge
offset({ alignmentAxis: 4 })
```

## Dynamic Offset (Derivable)

Pass a function that receives `MiddlewareState` and returns the offset value. Useful when the gap depends on the resolved placement or element dimensions.

```ts
import type { MiddlewareState } from "@domphy/floating"

offset((state: MiddlewareState) => {
  // Larger gap when floating vertically
  const isVertical = state.placement.startsWith("top") || state.placement.startsWith("bottom")
  return isVertical ? 8 : 12
})
```

Or compute based on the floating element's current size:

```ts
offset(({ rects }) => ({
  mainAxis: 8,
  // Center small floating elements on the reference start edge
  alignmentAxis: rects.reference.width / 2 - rects.floating.width / 2,
}))
```

## With Other Middleware

`offset` should come first so subsequent middleware (`flip`, `shift`) operate on coordinates that already include the gap:

```ts
import { computePosition, offset, flip, shift } from "@domphy/floating"

computePosition(reference, floating, {
  placement: "bottom",
  middleware: [
    offset(8),   // 1. add gap
    flip(),      // 2. flip if needed (accounts for the gap)
    shift(),     // 3. nudge back into view
  ],
})
```

## Theme-Aware Gap

`themeSpacing(n)` returns `${n / 4}em`. Parse it to get a pixel number for `offset`:

```ts
import { themeSpacing } from "@domphy/theme"

// themeSpacing(2) → "0.5em", but offset needs a number
// For a fixed-px gap, use a literal number directly
const GAP = 8  // 8px

computePosition(reference, floating, {
  middleware: [offset(GAP)],
})
```

## middlewareData

`offset` writes its computed coordinates to `middlewareData.offset`:

```ts
const { middlewareData } = await computePosition(reference, floating, {
  middleware: [offset({ mainAxis: 8, crossAxis: 4 })],
})

const { x, y, placement } = middlewareData.offset!
// x: horizontal component of the applied offset
// y: vertical component of the applied offset
// placement: the placement at the time offset ran
```

## TypeScript

```ts
import type { OffsetOptions } from "@domphy/floating"

// OffsetOptions = number
//               | { mainAxis?, crossAxis?, alignmentAxis? }
//               | (state: MiddlewareState) => number | { ... }

const fixed: OffsetOptions = 8
const axes: OffsetOptions = { mainAxis: 8, crossAxis: 4 }
const dynamic: OffsetOptions = ({ placement }) =>
  placement.startsWith("top") ? 12 : 8
```
