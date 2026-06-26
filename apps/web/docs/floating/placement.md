---
title: "Placement"
description: "The twelve placement values, how alignment works, and reading the resolved placement."
---

# Placement

`placement` tells `computePosition` where to position the floating element relative to the reference. It is the most fundamental option.

## Twelve Values

```
       top-start     top     top-end
         ┌────────────────────────┐
left-end │                        │ right-start
left     │       reference        │ right
left-start│                       │ right-end
         └────────────────────────┘
       bottom-start  bottom  bottom-end
```

The placement string has two parts: a **side** (`top`, `bottom`, `left`, `right`) and an optional **alignment** (`-start`, `-end`). No alignment means centered on that side.

```ts
import { computePosition } from "@domphy/floating"

// Centered above the reference
computePosition(reference, floating, { placement: "top" })

// Above, aligned to the left (start) edge of the reference
computePosition(reference, floating, { placement: "top-start" })

// To the right, aligned to the bottom (end) edge of the reference
computePosition(reference, floating, { placement: "right-end" })
```

| Side | Centered | Start-aligned | End-aligned |
|------|----------|---------------|-------------|
| Top | `"top"` | `"top-start"` | `"top-end"` |
| Bottom | `"bottom"` | `"bottom-start"` | `"bottom-end"` |
| Left | `"left"` | `"left-start"` | `"left-end"` |
| Right | `"right"` | `"right-start"` | `"right-end"` |

## Default Placement

If you omit `placement`, the default is `"bottom"`:

```ts
// These are equivalent
computePosition(reference, floating)
computePosition(reference, floating, { placement: "bottom" })
```

## Resolved Placement

Middleware like `flip` and `autoPlacement` can change the placement from what you requested. The `placement` field in the return value is always the **resolved** placement after all middleware ran:

```ts
const { x, y, placement } = await computePosition(reference, floating, {
  placement: "top",
  middleware: [flip()],
})

// If "top" had no room, placement may now be "bottom"
```

Store the resolved placement in state so other elements (arrow, CSS class, animation) can react to it:

```ts
import { toState } from "@domphy/core"
import { computePosition, flip, offset, shift } from "@domphy/floating"
import type { Placement } from "@domphy/floating"

const resolved = toState<Placement>("bottom")

function update() {
  computePosition(reference, floating, {
    placement: "bottom",
    middleware: [offset(8), flip(), shift()],
  }).then(({ x, y, placement }) => {
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
    resolved.set(placement as Placement)
  })
}

// React to placement changes in the UI
const Dropdown = {
  div: "Menu",
  dataPlacement: (l) => resolved.get(l),
  style: {
    position: "fixed",
    // Round corners on the side that is away from the reference
    borderRadius: (l) =>
      resolved.get(l).startsWith("bottom")
        ? "0 0 4px 4px"
        : "4px 4px 0 0",
  },
}
```

## Reactive Preferred Placement

To let the user switch the preferred placement at runtime, keep the preference in state and re-run `computePosition`:

```ts
import { toState } from "@domphy/core"
import type { Placement } from "@domphy/floating"

const preferred = toState<Placement>("bottom")

function update() {
  computePosition(reference, floating, {
    placement: preferred.get(),
    middleware: [flip()],
  }).then(({ x, y }) => {
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
  })
}

const Controls = {
  div: [
    { button: "Top",    onClick: () => { preferred.set("top");    update() } },
    { button: "Bottom", onClick: () => { preferred.set("bottom"); update() } },
    { button: "Left",   onClick: () => { preferred.set("left");   update() } },
    { button: "Right",  onClick: () => { preferred.set("right");  update() } },
  ],
}
```

## TypeScript

The `Placement` type is a union of all twelve string literals:

```ts
import type { Placement, AlignedPlacement, Side } from "@domphy/floating"

const p: Placement = "top-start"

// AlignedPlacement: only the 8 aligned variants (top-start, top-end, ...)
// Side: only "top" | "bottom" | "left" | "right"
```
