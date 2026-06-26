---
title: "Animations"
description: "Smooth drop animations with the animations() plugin and drag feedback classes in @domphy/dnd."
---

# Animations

The `animations()` plugin adds CSS transition animations to sort and transfer operations. Items slide into their new positions after a drop rather than snapping instantly.

## Basic Setup

Import `animations` and add it to `plugins`:

```ts
import { dragDrop, animations } from "@domphy/dnd"
import { toState } from "@domphy/core"
import { themeColor, themeSpacing } from "@domphy/theme"

const items = toState([
  { id: 1, label: "First" },
  { id: 2, label: "Second" },
  { id: 3, label: "Third" },
])

const SortableList = {
  ul: (l) =>
    items.get(l).map((item) => ({
      li: item.label,
      _key: item.id,
      style: {
        padding: themeSpacing(3),
        marginBottom: themeSpacing(2),
        backgroundColor: (cl) => themeColor(cl, "shift-2"),
        borderRadius: themeSpacing(2),
        cursor: "grab",
        userSelect: "none",
      },
    })),
  $: [dragDrop(items, { plugins: [animations()] })],
  style: { listStyle: "none", padding: "0" },
}
```

No extra CSS is required. `animations()` uses the Web Animations API internally and cleans up after itself.

## Configuration

```ts
animations({
  duration: 200,           // ms — animation length (default: 150)
  easing: "ease-in-out",   // any WAAPI easing string (default: "ease-in-out")
})
```

Examples:

```ts
animations({ duration: 100, easing: "ease" })
animations({ duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" })
animations({ duration: 50, easing: "linear" })
```

## Animations in Multi-Container

Apply `animations()` to each list independently — each container manages its own animation:

```ts
const GROUP = "board"

const ListA = {
  ul: (l) => stateA.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(stateA, { group: GROUP, plugins: [animations()] })],
}

const ListB = {
  ul: (l) => stateB.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(stateB, { group: GROUP, plugins: [animations()] })],
}
```

Lists without `animations()` snap instantly; lists with it animate.

## Combining Plugins

`plugins` is an array — pass multiple plugins in any order:

```ts
import { dragDrop, animations, dropOrSwap } from "@domphy/dnd"

dragDrop(items, {
  plugins: [
    animations({ duration: 180 }),
    dropOrSwap(),
  ],
})
```

## Visual Feedback with CSS Classes

`animations()` handles the reorder transition. For immediate visual feedback _during_ the drag, use the class config options. These are applied directly to DOM elements by FormKit, so they must live in a stylesheet:

```ts
dragDrop(items, {
  draggingClass: "item-dragging",          // the item being dragged
  dropZoneClass: "item-drop-target",       // item currently hovered over
  dropZoneParentClass: "list-drop-active", // parent list being hovered over
  plugins: [animations()],
})
```

```ts
const sheet = document.createElement("style")
sheet.textContent = `
  .item-dragging     { opacity: 0.4; }
  .item-drop-target  { outline: 2px dashed currentColor; outline-offset: -2px; }
  .list-drop-active  { background: rgba(0,0,0,.04); border-radius: 8px; }
`
document.head.appendChild(sheet)
```

## Synthetic Drag Classes

On touch and pointer devices, FormKit uses a synthetic drag instead of the native HTML5 drag API. A separate set of class options controls the appearance during synthetic drags:

```ts
dragDrop(items, {
  synthDraggingClass: "synth-dragging",
  synthDropZoneClass: "synth-drop-target",
  synthDropZoneParentClass: "synth-list-active",
  plugins: [animations()],
})
```

Use the same CSS class names for both native and synthetic if you want consistent feedback regardless of input device:

```ts
const CLS = "item-dragging"

dragDrop(items, {
  draggingClass: CLS,
  synthDraggingClass: CLS,
  plugins: [animations()],
})
```

## Respecting Reduced Motion

Check `prefers-reduced-motion` and skip the plugin when the user has requested it:

```ts
const prefersReducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

dragDrop(items, {
  plugins: prefersReducedMotion ? [] : [animations({ duration: 150 })],
})
```
