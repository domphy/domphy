---
title: "size"
description: "Constrain or match the floating element's dimensions using available viewport space."
---

# size

`size` measures the available space in the current placement and lets you apply size constraints to the floating element through an `apply` callback.

Common uses:
- cap `maxHeight` or `maxWidth` so the floating element never overflows the viewport
- match the floating element's width to the reference element's width (for select dropdowns)

```ts
import { computePosition, offset, flip, shift, size } from "@domphy/floating"

computePosition(reference, floating, {
  placement: "bottom",
  middleware: [
    offset(4),
    flip(),
    shift({ padding: 8 }),
    size({
      padding: 8,
      apply({ availableWidth, availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          maxWidth:  `${availableWidth}px`,
          maxHeight: `${availableHeight}px`,
        })
      },
    }),
  ],
})
```

## The `apply` Callback

`apply` receives the standard `MiddlewareState` extended with two additional fields:

| Argument | Type | Description |
|----------|------|-------------|
| `availableWidth` | `number` | Maximum width before the floating element would overflow |
| `availableHeight` | `number` | Maximum height before the floating element would overflow |
| `elements.floating` | `HTMLElement` | The floating DOM element — mutate its style here |
| `elements.reference` | `Element` | The reference element |
| `rects.reference` | `Rect` | Reference dimensions and position |

Mutate `elements.floating.style` directly inside `apply`. This is an imperative operation — Domphy's reactive state system is not involved.

## Constrain Max Height

The most common use — prevent a dropdown from overflowing the viewport:

```ts
size({
  padding: 8,
  apply({ availableHeight, elements }) {
    elements.floating.style.maxHeight = `${availableHeight}px`
    elements.floating.style.overflowY = "auto"
  },
})
```

## Match Reference Width

Make the dropdown the same width as the input that triggered it:

```ts
size({
  apply({ rects, elements }) {
    elements.floating.style.width = `${rects.reference.width}px`
  },
})
```

## Constrain Both Dimensions

```ts
size({
  padding: 8,
  apply({ availableWidth, availableHeight, elements }) {
    Object.assign(elements.floating.style, {
      maxWidth:  `${availableWidth}px`,
      maxHeight: `${availableHeight}px`,
    })
  },
})
```

## Composing With flip

`flip` and `size` work well together: `flip` picks the best side, then `size` constrains the element to whatever space is available on that side:

```ts
middleware: [
  offset(4),
  flip({ padding: 8 }),
  size({
    padding: 8,
    apply({ availableHeight, elements }) {
      elements.floating.style.maxHeight = `${availableHeight}px`
    },
  }),
]
```

## Full Select Dropdown Example

A scrollable dropdown that fills available viewport height and matches the trigger width:

```ts
import { toState } from "@domphy/core"
import { themeColor, themeSpacing } from "@domphy/theme"
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
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
      placement: "bottom-start",
      middleware: [
        offset(4),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        size({
          padding: 8,
          apply({ availableHeight, rects, elements }) {
            Object.assign(elements.floating.style, {
              width:     `${rects.reference.width}px`,
              maxHeight: `${Math.max(80, availableHeight)}px`,
            })
          },
        }),
      ],
      strategy: "fixed",
    }).then(({ x, y }) => {
      Object.assign(floating!.style, { left: `${x}px`, top: `${y}px` })
    })
  })
}

const DropdownList = {
  ul: [
    { li: "Option A" },
    { li: "Option B" },
    { li: "Option C" },
    { li: "Option D" },
    { li: "Option E" },
  ],
  style: {
    position: "fixed",
    overflowY: "auto",
    margin: 0,
    padding: themeSpacing(1),
    listStyle: "none",
    backgroundColor: (l) => themeColor(l, "inherit", "neutral"),
    border: (l) => `1px solid ${themeColor(l, "shift-6", "neutral")}`,
    borderRadius: themeSpacing(1),
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
      button: (l) => open.get(l) ? "Close" : "Open dropdown",
      onClick: () => {
        const next = !open.get()
        open.set(next)
        if (next) startPositioning()
        else { cleanup?.(); cleanup = null }
      },
      _onMount: (node) => {
        reference = node.domElement as HTMLElement
        if (floating) startPositioning()
      },
    },
    DropdownList,
  ],
}
```

## TypeScript

```ts
import type { SizeOptions, MiddlewareState } from "@domphy/floating"

const sizeConfig: SizeOptions = {
  padding: 8,
  apply(state: MiddlewareState & { availableWidth: number; availableHeight: number }) {
    Object.assign(state.elements.floating.style, {
      maxHeight: `${state.availableHeight}px`,
      width: `${state.rects.reference.width}px`,
    })
  },
}
```
