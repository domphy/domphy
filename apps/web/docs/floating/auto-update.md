---
title: "autoUpdate, hide & Virtual Elements"
description: "Keep position current as the DOM changes, hide when the reference is scrolled away, and position against non-DOM references."
---

# autoUpdate

`computePosition` is a one-shot calculation. `autoUpdate` subscribes to relevant DOM events and calls your update function whenever the position may have changed. It returns a cleanup function you must call when the floating element is removed.

```ts
import { computePosition, autoUpdate, offset, flip, shift } from "@domphy/floating"

function update() {
  computePosition(reference, floating, {
    placement: "bottom",
    middleware: [offset(8), flip(), shift()],
    strategy: "fixed",
  }).then(({ x, y }) => {
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
  })
}

const cleanup = autoUpdate(reference, floating, update)

// Later, when the floating element is hidden or removed:
cleanup()
```

## Signature

```ts
function autoUpdate(
  reference: ReferenceElement,
  floating: HTMLElement | null,
  update: () => void,
  options?: AutoUpdateOptions,
): () => void
```

## Options

```ts
autoUpdate(reference, floating, update, {
  ancestorScroll:  true,   // update on ancestor scroll events (default true)
  ancestorResize:  true,   // update on ancestor resize events (default true)
  elementResize:   true,   // update via ResizeObserver on both elements (default true)
  layoutShift:     true,   // update via IntersectionObserver on layout shift (default true)
  animationFrame:  false,  // update every rAF — for transform animations (default false)
})
```

### `ancestorScroll`

Listens for `scroll` events on all overflow ancestors of both the reference and floating elements. Enabled by default. Disable only if neither element is inside a scrollable container.

### `ancestorResize`

Listens for `resize` events on overflow ancestors. Covers window resize and any resizable container.

### `elementResize`

Uses `ResizeObserver` to watch both elements directly. Triggers when the reference or floating element grows or shrinks — for example when content loads inside the floating panel.

### `layoutShift`

Uses `IntersectionObserver` to detect when the reference moves because content was inserted above it in the page flow. Slightly more expensive than the scroll/resize listeners.

### `animationFrame`

Polls every `requestAnimationFrame`. Use this only when the reference element is animated with CSS `transform` — transforms do not trigger `ResizeObserver` or `IntersectionObserver`.

```ts
autoUpdate(reference, floating, update, { animationFrame: true })
```

## Domphy Pattern

Start `autoUpdate` in `_onMount` and clean up in `_onBeforeRemove`:

```ts
import { toState } from "@domphy/core"
import { computePosition, autoUpdate, offset, flip, shift } from "@domphy/floating"

const open = toState(false)

let reference: HTMLElement | null = null
let floating: HTMLElement | null = null
let cleanup: (() => void) | null = null

function updatePosition() {
  if (!reference || !floating) return
  computePosition(reference, floating, {
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 4 })],
    strategy: "fixed",
  }).then(({ x, y }) => {
    Object.assign(floating!.style, { left: `${x}px`, top: `${y}px` })
  })
}

const FloatingEl = {
  div: "Content",
  style: {
    position: "fixed",
    visibility: (l) => open.get(l) ? "visible" : "hidden",
  },
  _onMount: (node) => {
    floating = node.domElement as HTMLElement
    if (reference) cleanup = autoUpdate(reference, floating, updatePosition)
  },
  _onBeforeRemove: () => {
    cleanup?.()
    cleanup = null
  },
}

const Trigger = {
  button: "Toggle",
  onClick: () => open.set(!open.get()),
  _onMount: (node) => {
    reference = node.domElement as HTMLElement
    if (floating) cleanup = autoUpdate(reference, floating, updatePosition)
  },
}

const App = { div: [Trigger, FloatingEl] }
```

Only call `autoUpdate` when the floating element is visible. If you are using `visibility: hidden` to hide (rather than removing the element from the DOM), you can start `autoUpdate` once on mount and leave it running — it is lightweight enough for always-mounted panels.

---

# Virtual Elements

A virtual element is any object with a `getBoundingClientRect()` method. Use it when there is no real DOM element to anchor to — a mouse cursor, a canvas region, a `Range` selection, or a custom coordinate.

```ts
import type { VirtualElement } from "@domphy/floating"
import { computePosition, offset } from "@domphy/floating"

const virtualElement: VirtualElement = {
  getBoundingClientRect() {
    return {
      x: 100, y: 200,
      width: 0, height: 0,
      top: 200, left: 100, right: 100, bottom: 200,
    }
  },
}

computePosition(virtualElement, floating, {
  placement: "bottom",
  middleware: [offset(8)],
  strategy: "fixed",
})
```

## contextElement

Set `contextElement` to the nearest real DOM element so clipping boundary detection works correctly:

```ts
const virtualElement: VirtualElement = {
  getBoundingClientRect() { return { /* ... */ } },
  contextElement: containerEl,
}
```

## Follow the Cursor

Position a tooltip at the mouse pointer:

```ts
import type { VirtualElement } from "@domphy/floating"
import { computePosition, offset } from "@domphy/floating"

let mouseX = 0
let mouseY = 0

const cursor: VirtualElement = {
  getBoundingClientRect() {
    return {
      x: mouseX,     y: mouseY,
      width: 0,      height: 0,
      top: mouseY,   left: mouseX,
      right: mouseX, bottom: mouseY,
    }
  },
}

const TooltipEl = {
  div: "Cursor tooltip",
  style: { position: "fixed", pointerEvents: "none" },
  _onMount: (node) => {
    floating = node.domElement as HTMLElement
    document.addEventListener("mousemove", (event) => {
      mouseX = event.clientX
      mouseY = event.clientY
      computePosition(cursor, floating!, {
        placement: "right-start",
        middleware: [offset(8)],
        strategy: "fixed",
      }).then(({ x, y }) => {
        Object.assign(floating!.style, { left: `${x}px`, top: `${y}px` })
      })
    })
  },
}
```

## Text Selection Range

Position a formatting toolbar above a text selection:

```ts
import type { VirtualElement } from "@domphy/floating"
import { computePosition, flip, offset } from "@domphy/floating"

const selectionEl: VirtualElement = {
  getBoundingClientRect() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }
    }
    return sel.getRangeAt(0).getBoundingClientRect()
  },
}

document.addEventListener("selectionchange", () => {
  computePosition(selectionEl, toolbar, {
    placement: "top",
    middleware: [offset(8), flip()],
    strategy: "fixed",
  }).then(({ x, y }) => {
    Object.assign(toolbar.style, { left: `${x}px`, top: `${y}px` })
  })
})
```

---

# hide

`hide` provides flags to conditionally hide the floating element when the reference is scrolled out of view or when the floating element escapes its clipping context.

```ts
import { computePosition, offset, flip, shift, hide } from "@domphy/floating"

const { middlewareData } = await computePosition(reference, floating, {
  placement: "bottom",
  middleware: [offset(8), flip(), shift(), hide()],
})

const { referenceHidden } = middlewareData.hide!
floating.style.visibility = referenceHidden ? "hidden" : "visible"
```

## Strategies

```ts
// "referenceHidden" (default): hide when the reference is scrolled out of its clipping boundary
hide({ strategy: "referenceHidden" })

// "escaped": hide when the floating element leaves the reference's clipping context
hide({ strategy: "escaped" })
```

Use both strategies at once by including `hide` twice:

```ts
middleware: [
  offset(8),
  flip(),
  shift(),
  hide({ strategy: "referenceHidden" }),
  hide({ strategy: "escaped" }),
]
```

Then read both flags:

```ts
const { referenceHidden, escaped } = middlewareData.hide!
floating.style.visibility = (referenceHidden || escaped) ? "hidden" : "visible"
```

## Reactive Hide

Store the hidden state in reactive state so the UI updates:

```ts
import { toState } from "@domphy/core"

const isHidden = toState(false)

function updatePosition() {
  computePosition(reference, floating, {
    middleware: [offset(8), flip(), shift(), hide()],
    strategy: "fixed",
  }).then(({ x, y, middlewareData }) => {
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
    isHidden.set(!!middlewareData.hide?.referenceHidden)
  })
}

const FloatingEl = {
  div: "Content",
  style: {
    position: "fixed",
    visibility: (l) => isHidden.get(l) ? "hidden" : "visible",
    opacity: (l) => isHidden.get(l) ? "0" : "1",
  },
}
```

## TypeScript

```ts
import type {
  AutoUpdateOptions,
  VirtualElement,
  ReferenceElement,
  HideOptions,
} from "@domphy/floating"

const updateOptions: AutoUpdateOptions = {
  ancestorScroll: true,
  ancestorResize: true,
  elementResize: true,
  layoutShift: false,   // disable if reference is fixed-position
  animationFrame: false,
}

const hideConfig: HideOptions = {
  strategy: "referenceHidden",
  padding: 4,
}
```

---

# createFloating

`createFloating()` is a stateful manager that combines `computePosition` + `autoUpdate` into a [Popper.js](https://popper.js.org/)-like imperative handle. Use it when you need a reusable positioning object rather than writing the cleanup boilerplate by hand.

```ts
import { createFloating, offset, flip, shift } from "@domphy/floating"

const handle = createFloating({
  placement: "bottom",
  middleware: [offset(8), flip(), shift({ padding: 4 })],
  strategy: "fixed",
})

// Wire DOM elements once both are available:
handle.connect(referenceEl, floatingEl)
handle.onUpdate(({ x, y }) => {
  Object.assign(floatingEl.style, { left: `${x}px`, top: `${y}px` })
})

// When the floating element leaves the DOM:
handle.disconnect()
```

## Domphy Lifecycle Pattern

```ts
import { toState } from "@domphy/core"
import { createFloating, offset, flip, shift } from "@domphy/floating"

const open = toState(false)

let reference: HTMLElement | null = null

const handle = createFloating({
  placement: "bottom",
  middleware: [offset(8), flip(), shift({ padding: 4 })],
  strategy: "fixed",
})

const FloatingEl = {
  div: "Content",
  style: {
    position: "fixed",
    visibility: (l) => open.get(l) ? "visible" : "hidden",
  },
  _onMount: (node) => {
    const floating = node.domElement as HTMLElement
    handle.onUpdate(({ x, y }) => {
      Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
    })
    if (reference) handle.connect(reference, floating)
  },
  _onBeforeRemove: () => handle.disconnect(),
}

const Trigger = {
  button: "Toggle",
  onClick: () => open.set(!open.get()),
  _onMount: (node) => {
    reference = node.domElement as HTMLElement
  },
}
```

## Signature

```ts
function createFloating(config?: Partial<ComputePositionConfig>): FloatingHandle

interface FloatingHandle {
  connect(reference: ReferenceElement, floating: HTMLElement, options?: AutoUpdateOptions): void
  disconnect(): void
  readonly position: FloatingPosition | null
  onUpdate(callback: (position: FloatingPosition) => void): () => void
}

interface FloatingPosition {
  x: number
  y: number
  placement: Placement
  strategy: Strategy
  middlewareData: MiddlewareData
}
```

## `handle.position`

After the first `connect()` call resolves, `handle.position` holds the last computed result. It is `null` before the first update completes. Use `onUpdate` for reactive updates; read `position` for a synchronous snapshot after-the-fact.

## Reconfiguring

`createFloating` does not support changing `config` after creation. To switch placement or middleware at runtime, `disconnect()`, create a new handle, and `connect()` again — or keep separate handles for each configuration.
