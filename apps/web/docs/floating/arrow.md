---
title: "arrow"
description: "Position an arrow element inside the floating element so it points toward the reference."
---

# arrow

`arrow` computes the offset of an arrow element inside the floating element. It does not render anything — you are responsible for the markup and CSS. `arrow` only tells you where to place the arrow within the floating element.

## Setup

Pass the arrow's DOM element via `_onMount`:

```ts
import { computePosition, offset, flip, shift, arrow } from "@domphy/floating"

let arrowEl: HTMLElement | null = null

computePosition(reference, floating, {
  placement: "bottom",
  middleware: [
    offset(12),     // leave room for the arrow
    flip(),
    shift({ padding: 4 }),
    arrow({ element: arrowEl! }),  // arrow goes last
  ],
})
```

Capture the arrow element in a `_onMount` hook on the arrow node:

```ts
const Arrow = {
  div: null,
  style: {
    position: "absolute",
    width: "8px",
    height: "8px",
    backgroundColor: (l) => themeColor(l, "shift-11", "neutral"),
    transform: "rotate(45deg)",
  },
  _onMount: (node) => { arrowEl = node.domElement as HTMLElement },
}
```

## Reading Arrow Position

`arrow` writes to `middlewareData.arrow`:

```ts
const { middlewareData, placement } = await computePosition(reference, floating, {
  middleware: [offset(12), flip(), shift(), arrow({ element: arrowEl! })],
})

const { x, y } = middlewareData.arrow!
// x: horizontal offset within the floating element (defined for top/bottom placements)
// y: vertical offset within the floating element (defined for left/right placements)
// One of x or y is undefined depending on the placement axis
```

Apply the position based on the resolved placement. The arrow sits on the **opposite** side from where the floating element opens:

```ts
const staticSide: Record<string, string> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
}

const { x: ax, y: ay } = middlewareData.arrow!
const side = placement.split("-")[0]

Object.assign(arrowEl!.style, {
  left:   ax != null ? `${ax}px` : "",
  top:    ay != null ? `${ay}px` : "",
  right:  "",
  bottom: "",
  [staticSide[side]]: "-4px",  // protrude outside the floating element
})
```

## Padding

Add padding to prevent the arrow from touching the floating element's rounded corners:

```ts
arrow({ element: arrowEl!, padding: 6 })

// Asymmetric padding
arrow({ element: arrowEl!, padding: { top: 4, right: 8, bottom: 4, left: 8 } })
```

## Full Tooltip With Arrow

A tooltip that keeps the arrow pointing at the reference after a `flip`:

```ts
import { toState } from "@domphy/core"
import { themeColor, themeSpacing } from "@domphy/theme"
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  type Placement,
} from "@domphy/floating"

const open = toState(false)
const resolvedPlacement = toState<Placement>("bottom")

let reference: HTMLElement | null = null
let floating: HTMLElement | null = null
let arrowEl: HTMLElement | null = null
let cleanup: (() => void) | null = null

const staticSide: Record<string, string> = {
  top: "bottom", right: "left", bottom: "top", left: "right",
}

function updatePosition() {
  if (!reference || !floating || !arrowEl) return
  computePosition(reference, floating, {
    placement: "bottom",
    middleware: [
      offset(12),
      flip(),
      shift({ padding: 4 }),
      arrow({ element: arrowEl, padding: 4 }),
    ],
    strategy: "fixed",
  }).then(({ x, y, placement, middlewareData }) => {
    Object.assign(floating!.style, { left: `${x}px`, top: `${y}px` })
    resolvedPlacement.set(placement as Placement)

    const { x: ax, y: ay } = middlewareData.arrow!
    const side = placement.split("-")[0]

    Object.assign(arrowEl!.style, {
      left:   ax != null ? `${ax}px` : "",
      top:    ay != null ? `${ay}px` : "",
      right:  "",
      bottom: "",
      [staticSide[side]]: "-4px",
    })
  })
}

function startPositioning() {
  if (!reference || !floating) return
  cleanup?.()
  cleanup = autoUpdate(reference, floating, updatePosition)
}

const Arrow = {
  div: null,
  style: {
    position: "absolute",
    width: "8px",
    height: "8px",
    backgroundColor: (l) => themeColor(l, "shift-11", "neutral"),
    transform: "rotate(45deg)",
  },
  _onMount: (node) => { arrowEl = node.domElement as HTMLElement },
}

const Tooltip = {
  div: [Arrow, "Tooltip text"],
  style: {
    position: "fixed",
    padding: themeSpacing(1),
    paddingInline: themeSpacing(2),
    backgroundColor: (l) => themeColor(l, "shift-11", "neutral"),
    color: (l) => themeColor(l, "shift-1", "neutral"),
    borderRadius: themeSpacing(1),
    fontSize: "0.875rem",
    pointerEvents: "none",
    visibility: (l) => open.get(l) ? "visible" : "hidden",
  },
  _onMount: (node) => {
    floating = node.domElement as HTMLElement
    if (reference) startPositioning()
  },
  _onBeforeRemove: () => { cleanup?.(); cleanup = null },
}

const App = {
  div: [
    {
      button: "Hover me",
      onMouseEnter: () => { open.set(true); startPositioning() },
      onMouseLeave: () => { open.set(false); cleanup?.(); cleanup = null },
      _onMount: (node) => {
        reference = node.domElement as HTMLElement
        if (floating) startPositioning()
      },
    },
    Tooltip,
  ],
}
```

## centerOffset

`middlewareData.arrow.centerOffset` tells you how far the arrow is from the perfect center. A non-zero value means the reference is too small to center the arrow without it overlapping the floating element's edge:

```ts
const { centerOffset } = middlewareData.arrow!
// 0 = arrow is centered on the reference
// positive/negative = how many px the arrow had to move from center

// Hide the arrow if it would look misplaced
if (Math.abs(centerOffset) > 4) {
  arrowEl!.style.opacity = "0"
}
```

## TypeScript

```ts
import type { ArrowOptions } from "@domphy/floating"

const arrowConfig: ArrowOptions = {
  element: arrowEl!,
  padding: 6,
}
```
