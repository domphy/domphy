---
title: "Animations"
description: "Smooth drop animations with the animations() plugin and drag feedback classes in @domphy/dnd."
---

# Animations

The `animations()` plugin adds CSS transition animations to sort and transfer operations. Items slide into their new positions after a drop rather than snapping instantly.

**`dragDrop()` includes animations by default** — no configuration needed.

## Basic Setup

Animations are on automatically:

```ts
import { dragDrop } from "@domphy/dnd"
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
  $: [dragDrop(items)],
  style: { listStyle: "none", padding: "0" },
}
```

To disable: `dragDrop(items, { animated: false })`.

`animations()` uses the Web Animations API internally and cleans up after itself.

## Configuration

To customize animation duration or easing, disable the default and pass the plugin explicitly:

```ts
import { dragDrop, animations } from "@domphy/dnd"

dragDrop(items, {
  animated: false,  // disable default
  plugins: [animations({ duration: 200, easing: "ease-in-out" })],
})
```

Examples:

```ts
animations({ duration: 100, easing: "ease" })
animations({ duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" })
animations({ duration: 50, easing: "linear" })
```

## Animations in Multi-Container

Animations are on by default in all `dragDrop()` calls — including multi-container setups:

```ts
const GROUP = "board"

const ListA = {
  ul: (l) => stateA.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(stateA, { group: GROUP })],
}

const ListB = {
  ul: (l) => stateB.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(stateB, { group: GROUP })],
}
```

Pass `animated: false` on any individual list to opt it out of animations.

## Combining Plugins

`animations()` is included by default. To add other plugins alongside it, append them to `plugins` — `animations()` prepends automatically:

```ts
import { dragDrop, dropOrSwap } from "@domphy/dnd"

// Other plugins alongside default animation:
dragDrop(items, {
  plugins: [dropOrSwap()],
})
```

To use a custom animation config alongside other plugins, disable the default first:

```ts
import { dragDrop, animations, dropOrSwap } from "@domphy/dnd"

dragDrop(items, {
  animated: false,
  plugins: [
    animations({ duration: 180 }),
    dropOrSwap(),
  ],
})
```

## Visual Feedback with CSS Classes

`animations()` handles the reorder transition (enabled by default). For immediate visual feedback _during_ the drag, use the class config options. These are applied directly to DOM elements by FormKit, so they must live in a stylesheet:

```ts
dragDrop(items, {
  draggingClass: "item-dragging",          // the item being dragged
  dropZoneClass: "item-drop-target",       // item currently hovered over
  dropZoneParentClass: "list-drop-active", // parent list being hovered over
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
})
```

Use the same CSS class names for both native and synthetic if you want consistent feedback regardless of input device:

```ts
const CLS = "item-dragging"

dragDrop(items, {
  draggingClass: CLS,
  synthDraggingClass: CLS,
})
```

## Respecting Reduced Motion

Use `animated: false` to disable animations for users who prefer reduced motion:

```ts
const prefersReducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

dragDrop(items, {
  animated: !prefersReducedMotion,
})
```
