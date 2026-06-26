---
title: "Refs & DOM Access"
description: "Access DOM nodes directly using _onMount, _onRemove, and ElementNode.domElement."
---

# Refs & DOM Access

Domphy does not have a `ref` API like React. Instead, use the `_onMount` and `_onRemove` lifecycle hooks to access the underlying DOM node.

## `_onMount`

Called after the element is inserted into the DOM. The argument is the `ElementNode` wrapper with a `.domElement` property:

```ts
import type { ElementNode } from "@domphy/core"

const Canvas = {
  canvas: null,
  width: 400,
  height: 300,
  _onMount: (node: ElementNode) => {
    const canvas = node.domElement as HTMLCanvasElement
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#6366f1"
    ctx.fillRect(0, 0, 400, 300)
  },
}
```

## `_onRemove`

Called before the element is removed from the DOM. Use it to clean up timers, observers, and event listeners:

```ts
let interval: ReturnType<typeof setInterval>

const LiveClock = {
  time: null,
  _onMount: (node: ElementNode) => {
    const el = node.domElement as HTMLTimeElement
    interval = setInterval(() => {
      el.textContent = new Date().toLocaleTimeString()
    }, 1000)
  },
  _onRemove: () => {
    clearInterval(interval)
  },
}
```

## Storing element references

Close over a variable to keep a ref you can use later:

```ts
import { toState } from "@domphy/core"
import type { ElementNode } from "@domphy/core"

let inputRef: HTMLInputElement | null = null

const SearchInput = {
  input: null,
  type: "search",
  placeholder: "Search…",
  _onMount: (node: ElementNode) => {
    inputRef = node.domElement as HTMLInputElement
  },
  _onRemove: () => {
    inputRef = null
  },
}

// Programmatically focus the input
function focusSearch() {
  inputRef?.focus()
}

const SearchButton = {
  button: "Focus search",
  onClick: focusSearch,
}
```

## `toState` as a ref

Use `toState<HTMLElement | null>(null)` to make the ref reactive — useful when other elements need to observe it:

```ts
import { toState } from "@domphy/core"
import type { ElementNode } from "@domphy/core"

const anchorRef = toState<HTMLButtonElement | null>(null)

const Anchor = {
  button: "Open",
  _onMount: (node: ElementNode) => {
    anchorRef.set(node.domElement as HTMLButtonElement)
  },
  _onRemove: () => anchorRef.set(null),
}

const Popover = {
  div: "Popover content",
  // Position relative to the anchor
  style: (l) => {
    const anchor = anchorRef.get(l)
    if (!anchor) return { display: "none" }
    const rect = anchor.getBoundingClientRect()
    return {
      position: "fixed",
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`,
    }
  },
}
```

## Wiring third-party libraries

`_onMount` is the right place to integrate any library that requires a DOM node:

```ts
// Chart.js integration
import { Chart } from "chart.js/auto"

let chart: Chart | null = null

const ChartCanvas = {
  canvas: null,
  _onMount: (node: ElementNode) => {
    chart = new Chart(node.domElement as HTMLCanvasElement, {
      type: "bar",
      data: { labels: ["A", "B", "C"], datasets: [{ data: [1, 2, 3] }] },
    })
  },
  _onRemove: () => {
    chart?.destroy()
    chart = null
  },
}
```

## Forwarding refs to child elements

When a component needs to expose a DOM ref to its parent, accept a callback:

```ts
import type { ElementNode } from "@domphy/core"

interface InputProps {
  placeholder?: string
  onRef?: (el: HTMLInputElement | null) => void
}

function Input({ placeholder, onRef }: InputProps) {
  return {
    input: null,
    type: "text",
    placeholder: placeholder ?? "",
    _onMount: (node: ElementNode) => onRef?.(node.domElement as HTMLInputElement),
    _onRemove: () => onRef?.(null),
  }
}

// Usage: parent gets the DOM element
let ref: HTMLInputElement | null = null
const field = Input({ placeholder: "Name", onRef: (el) => { ref = el } })
```

## ResizeObserver

Observe size changes without polling:

```ts
import { toState } from "@domphy/core"

const width = toState(0)
let observer: ResizeObserver | null = null

const ResponsiveBox = {
  div: (l) => `Width: ${width.get(l)}px`,
  _onMount: (node) => {
    observer = new ResizeObserver(([entry]) => {
      width.set(Math.round(entry.contentRect.width))
    })
    observer.observe(node.domElement)
  },
  _onRemove: () => {
    observer?.disconnect()
    observer = null
  },
}
```

## IntersectionObserver

Trigger lazy loading or animations when an element enters the viewport:

```ts
import { toState } from "@domphy/core"

function lazyLoad(src: string) {
  const visible = toState(false)
  let observer: IntersectionObserver | null = null

  return {
    img: null,
    src: (l) => visible.get(l) ? src : "",
    alt: "lazy image",
    _onMount: (node) => {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          visible.set(true)
          observer?.disconnect()
        }
      }, { rootMargin: "200px" })
      observer.observe(node.domElement)
    },
    _onRemove: () => observer?.disconnect(),
  }
}
```

## Comparing to React

| React | Domphy |
|-------|--------|
| `useRef<T>(null)` → `ref.current` | `let ref: T \| null = null` closed over in `_onMount` |
| `ref={myRef}` on JSX | `_onMount: (node) => { ref = node.domElement }` |
| `useCallback` ref | Callback passed as prop, called in `_onMount` |
| `useImperativeHandle` | Return an object with methods from a function, close over DOM ref |
| `forwardRef` | Accept `onRef` callback as prop |
