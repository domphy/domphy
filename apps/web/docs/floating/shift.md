---
title: "shift & limitShift"
description: "Slide the floating element along the reference edge to prevent viewport clipping."
---

# shift

`shift` moves the floating element along its alignment axis to keep it within the clipping boundary. Unlike `flip` (which changes the side), `shift` slides the element while keeping it on the same side.

```ts
import { computePosition, offset, flip, shift } from "@domphy/floating"

computePosition(reference, floating, {
  placement: "top",
  middleware: [offset(8), flip(), shift()],
})
```

## How It Works

When the floating element would overflow the start or end of the placement axis, `shift` nudges it just enough to bring the overflowing edge back inside the boundary.

```
Without shift:        With shift:
┌────────────┐        ┌────────────┐
│ reference  │        │ reference  │
└────────────┘        └────────────┘
        ┌──────────┐  ┌──────────┐
        │ floating │  │ floating │
        └──────────┘  └──────────┘
         clips right!  back in view
```

## Padding

Add space between the floating element and the boundary edge before the shift kicks in:

```ts
shift({ padding: 4 })    // 4px gap from all edges

// Per-side
shift({
  padding: { top: 8, right: 4, bottom: 8, left: 4 },
})
```

## Cross Axis

By default `shift` only moves on the main axis (along the side). To also allow movement perpendicular to the placement side:

```ts
shift({ crossAxis: true })
```

This is rarely needed and can cause the floating element to visually detach from the reference. Prefer `flip` for that axis.

## middlewareData

`shift` writes to `middlewareData.shift`:

```ts
const { middlewareData } = await computePosition(reference, floating, {
  middleware: [offset(8), shift()],
})

const { x, y, enabled } = middlewareData.shift!
// x: pixels shifted horizontally
// y: pixels shifted vertically
// enabled: { x: boolean, y: boolean } — which axes were shifted
```

---

# limitShift

Without a limiter, `shift` can slide the floating element far from the reference when the user scrolls. `limitShift` stops the shift when the reference and floating element's edges align, keeping the floating element visually anchored.

```ts
import { computePosition, offset, flip, shift, limitShift } from "@domphy/floating"

computePosition(reference, floating, {
  placement: "top",
  middleware: [
    offset(8),
    flip(),
    shift({ limiter: limitShift() }),
  ],
})
```

## limitShift Options

```ts
limitShift({
  // Start limiting earlier (+) or later (-) than the default edge-align point
  offset: 4,

  // Control which axes are limited
  mainAxis: true,    // default true
  crossAxis: true,   // default true
})
```

`offset` can also be an object for asymmetric control:

```ts
limitShift({ offset: { mainAxis: 4, crossAxis: 8 } })
```

## Full Tooltip Example

A tooltip that stays visible during scroll but does not drift away from the reference:

```ts
import { toState } from "@domphy/core"
import { themeColor, themeSpacing } from "@domphy/theme"
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  limitShift,
} from "@domphy/floating"

const open = toState(false)

let reference: HTMLElement | null = null
let floating: HTMLElement | null = null
let cleanup: (() => void) | null = null

function startPositioning() {
  if (!reference || !floating) return
  cleanup?.()
  cleanup = autoUpdate(reference, floating, () => {
    computePosition(reference!, floating!, {
      placement: "top",
      middleware: [
        offset(8),
        flip(),
        shift({
          padding: 8,
          limiter: limitShift(),
        }),
      ],
      strategy: "fixed",
    }).then(({ x, y }) => {
      Object.assign(floating!.style, { left: `${x}px`, top: `${y}px` })
    })
  })
}

const App = {
  div: [
    {
      button: "Hover me",
      onMouseEnter: () => { open.set(true); startPositioning() },
      onMouseLeave: () => { open.set(false); cleanup?.(); cleanup = null },
      _onMount: (node) => { reference = node.domElement as HTMLElement },
    },
    {
      div: "Tooltip text",
      style: {
        position: "fixed",
        visibility: (l) => open.get(l) ? "visible" : "hidden",
        backgroundColor: (l) => themeColor(l, "shift-12", "neutral"),
        color: (l) => themeColor(l, "shift-1", "neutral"),
        padding: themeSpacing(1),
        borderRadius: themeSpacing(1),
        fontSize: "0.875rem",
        pointerEvents: "none",
      },
      _onMount: (node) => {
        floating = node.domElement as HTMLElement
        if (reference) startPositioning()
      },
      _onBeforeRemove: () => { cleanup?.(); cleanup = null },
    },
  ],
}
```

## TypeScript

```ts
import type { ShiftOptions, LimitShiftOptions } from "@domphy/floating"

const shiftConfig: ShiftOptions = {
  padding: 8,
  mainAxis: true,
  crossAxis: false,
  limiter: limitShift({ offset: 4 }),
}

const limitConfig: LimitShiftOptions = {
  offset: { mainAxis: 4, crossAxis: 0 },
  mainAxis: true,
  crossAxis: false,
}
```
