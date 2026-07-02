---
title: "Getting Started"
description: "Install @domphy/floating and position a floating element in three steps."
---

# @domphy/floating

`@domphy/floating` places any floating element — tooltip, popover, dropdown, context menu — next to a reference element. It handles viewport clipping, scrolling, resizing, and placement flips automatically.

The package is a direct vendor of [Floating UI DOM](https://floating-ui.com) with zero extra dependencies and the same API surface.

## Install

::: code-group
```bash [NPM]
npm install @domphy/floating
```
```html [CDN]
<script src="https://unpkg.com/@domphy/floating/dist/floating.global.js"></script>
```
:::

`@domphy/floating` is framework-agnostic and has zero dependencies — it does not depend on `@domphy/core`. The tooltip example below also uses `@domphy/core` (`ElementNode`, `toState`) and `@domphy/theme`; install those separately if you want to follow along, but they are not required to use `@domphy/floating` on its own.

## Core Concepts

There are three things to learn:

1. **`computePosition`** — calculates the `x`/`y` coordinates to place a floating element next to a reference element.
2. **Middleware** — functions that modify those coordinates. `offset` adds a gap, `flip` avoids viewport overflow, `shift` nudges the element back into view.
3. **`autoUpdate`** — keeps the position current while the user scrolls or resizes. Returns a cleanup function you must call when the floating element is removed.

## First Example — Tooltip

A working tooltip in plain Domphy objects:

```ts
import { ElementNode, toState } from "@domphy/core"
import { themeColor, themeSpacing } from "@domphy/theme"
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  type Placement,
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
      middleware: [offset(8), flip(), shift({ padding: 4 })],
      strategy: "fixed",
    }).then(({ x, y }) => {
      Object.assign(floating!.style, { left: `${x}px`, top: `${y}px` })
    })
  })
}

const Tooltip = {
  div: "Tooltip text",
  style: {
    position: "fixed",
    padding: themeSpacing(1),
    backgroundColor: (l) => themeColor(l, "shift-11", "neutral"),
    color: (l) => themeColor(l, "shift-1", "neutral"),
    borderRadius: themeSpacing(1),
    pointerEvents: "none",
    visibility: (l) => open.get(l) ? "visible" : "hidden",
  },
  _onMount: (node) => {
    floating = node.domElement as HTMLElement
    if (reference) startPositioning()
  },
  _onBeforeRemove: () => {
    cleanup?.()
    cleanup = null
  },
}

const App = {
  div: [
    {
      button: "Hover me",
      style: { padding: themeSpacing(2) },
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

new ElementNode(App).render(document.getElementById("app")!)
```

Three things to notice:

- The floating element uses `visibility` (not `display: none`) so `computePosition` can measure its size even when hidden.
- The floating element has `position: "fixed"` — this must match the `strategy: "fixed"` passed to `computePosition`.
- `autoUpdate` is started on mount and cleaned up in `_onBeforeRemove`.

## What `computePosition` Returns

```ts
const { x, y, placement, strategy, middlewareData } = await computePosition(
  reference,
  floating,
  { placement: "bottom", middleware: [offset(8), flip(), shift()] }
)
```

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | Left offset to apply to the floating element |
| `y` | `number` | Top offset to apply to the floating element |
| `placement` | `Placement` | The final placement after middleware resolution |
| `strategy` | `Strategy` | `"absolute"` or `"fixed"` |
| `middlewareData` | `MiddlewareData` | Per-middleware output (arrow position, overflow info, etc.) |

Apply `x` and `y` directly to the element's `style.left` and `style.top`:

```ts
Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
```

## Middleware Order

Order matters. The conventional order is:

```ts
middleware: [
  offset(8),                   // 1. add gap first
  flip(),                      // 2. flip to opposite side if needed
  shift(),                     // 3. nudge back inside the viewport
  arrow({ element: arrowEl }), // 4. position the arrow last
]
```

See the dedicated pages for each middleware.

## Strategy

`strategy` controls the CSS `position` property of the floating element. The value you pass must match what you put on the element.

```ts
// strategy: "absolute" (default) — use when floating is inside the same scroll context
{ div: "Floating", style: { position: "absolute" } }
computePosition(reference, floating, { strategy: "absolute" })

// strategy: "fixed" — use when floating is in a portal or the root document
{ div: "Floating", style: { position: "fixed" } }
computePosition(reference, floating, { strategy: "fixed" })
```

For most portal-based UIs (popovers, dropdowns), `"fixed"` is the right choice.

## Additional middleware

### `inline`

For reference elements that span multiple lines (hyperlinks, text selections, range selections), `inline` improves position accuracy by basing placement on the hovered/selected line boundary instead of the full bounding rect.

```ts
import { computePosition, inline, offset } from "@domphy/floating"

computePosition(reference, floating, {
  middleware: [inline(), offset(8)],
})
```

Useful when the reference is a `<span>` inside a paragraph that wraps.

### `detectOverflow`

Low-level utility used internally by `flip`, `shift`, and `hide`. Returns a `SideObject` with the overflow amount (in px) on each side relative to the boundary. Positive = outside boundary, negative = inside.

```ts
import { detectOverflow } from "@domphy/floating"
import type { MiddlewareState } from "@domphy/floating"

const myMiddleware = {
  name: "myMiddleware",
  async fn(state: MiddlewareState) {
    const overflow = await detectOverflow(state)
    // overflow.top, overflow.right, overflow.bottom, overflow.left
    return {}
  },
}
```

Use `detectOverflow` inside a custom middleware when you need raw overflow data before applying your own transform.
