---
title: "Handles & Filtering"
description: "Scope dragging to a handle element, disable specific items, filter by value, and add a custom drag image."
---

# Handles & Filtering

By default every child of a drag-and-drop list is draggable. This page shows how to restrict dragging to a handle element, exclude specific items, filter by item data, and provide a custom drag ghost.

## Drag Handle

Set `dragHandle` to a CSS selector. FormKit searches descendants of each list item for a matching element; dragging only starts when the pointer lands on that element.

```ts
import { dragDrop } from "@domphy/dnd"
import { toState } from "@domphy/core"
import { themeColor, themeSpacing } from "@domphy/theme"

const items = toState([
  { id: 1, label: "Task Alpha" },
  { id: 2, label: "Task Beta" },
  { id: 3, label: "Task Gamma" },
])

const App = {
  ul: (l) =>
    items.get(l).map((item) => ({
      _key: item.id,
      li: [
        {
          span: "⠿",
          class: "handle",
          style: {
            cursor: "grab",
            padding: `0 ${themeSpacing(2)}`,
            color: (cl) => themeColor(cl, "shift-5"),
            userSelect: "none",
            flexShrink: "0",
          },
        },
        { span: item.label },
      ],
      style: {
        display: "flex",
        alignItems: "center",
        gap: themeSpacing(2),
        padding: themeSpacing(3),
        marginBottom: themeSpacing(2),
        backgroundColor: (cl) => themeColor(cl, "shift-2"),
        borderRadius: themeSpacing(2),
        cursor: "default", // item body is NOT draggable
      },
    })),
  $: [dragDrop(items, { dragHandle: ".handle" })],
  style: { listStyle: "none", padding: "0" },
}
```

`dragHandle` is a standard CSS selector string searched at any depth — `.handle`, `[data-drag-handle]`, or `button.drag-icon` all work.

## External Drag Handle

For a handle element that lives _outside_ the list item, use `externalDragHandle`:

```ts
const handleEl = document.createElement("div")
handleEl.textContent = "⠿"
handleEl.style.cursor = "grab"
document.body.appendChild(handleEl)

dragDrop(items, {
  externalDragHandle: {
    el: handleEl,
    callback: () => {
      // Return the list item element to drag when the handle is pressed.
      // Typically this is computed from the currently focused/hovered item.
      return document.querySelector(".focused-item") as HTMLElement
    },
  },
})
```

## Filtering by DOM Element

`draggable` receives each child's `HTMLElement`; return `false` to prevent that item from dragging. Use `data-*` attributes to bridge DOM and data:

```ts
type Task = { id: number; title: string; locked?: boolean }

const tasks = toState<Task[]>([
  { id: 1, title: "Locked header", locked: true },
  { id: 2, title: "Movable task" },
  { id: 3, title: "Also movable" },
])

const App = {
  ul: (l) =>
    tasks.get(l).map((task) => ({
      li: task.title,
      _key: task.id,
      dataLocked: task.locked ? "true" : "false",
      style: {
        padding: themeSpacing(3),
        marginBottom: themeSpacing(2),
        backgroundColor: (cl) => themeColor(cl, "shift-2"),
        borderRadius: themeSpacing(2),
        cursor: task.locked ? "not-allowed" : "grab",
        opacity: task.locked ? "0.5" : "1",
        userSelect: "none",
      },
    })),
  $: [
    dragDrop(tasks, {
      draggable: (el) => el.dataset.locked !== "true",
    }),
  ],
  style: { listStyle: "none", padding: "0" },
}
```

Non-draggable items stay in place and other items sort around them.

## Filtering by Value

`draggableValue` receives the item value itself — cleaner when the decision depends only on the data and not on DOM attributes:

```ts
dragDrop(tasks, {
  draggableValue: (task) => !(task as Task).locked,
})
```

## Disabling the Entire List

Set `disabled: true` to temporarily stop all dragging in a list. Useful for a read-only mode:

```ts
const readonly = toState(false)

// Because $ can be a reactive function, rebuild the patch when readonly changes.
const App = {
  ul: (l) =>
    items.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: (l) => [dragDrop(items, { disabled: readonly.get(l) })],
}

// Toggle:
readonly.set(true)
```

::: warning Reactive $ caveat
When `$` is a function, Domphy re-evaluates it on every state change that the function depends on. This tears down and re-registers the FormKit listeners on each toggle. For frequently-toggled lists, prefer keeping `disabled` out of the reactive function and using `updateConfig` from FormKit directly:

```ts
import { updateConfig, parents } from "@domphy/dnd"

// After mounting, grab the parent element and update config directly:
function setReadonly(listEl: HTMLElement, value: boolean) {
  updateConfig(listEl, { disabled: value })
}
```
:::

## Custom Drag Image

By default the browser clones the dragged element as the ghost. Override with `dragImage` to return a custom element for native drag operations:

```ts
dragDrop(items, {
  dragImage: (_data, draggedNodes) => {
    const ghost = document.createElement("div")
    ghost.textContent = draggedNodes.length > 1
      ? `Moving ${draggedNodes.length} items`
      : `Moving "${(draggedNodes[0].data.value as { label: string }).label}"`
    ghost.style.cssText = [
      "padding: 8px 14px",
      "background: #000",
      "color: #fff",
      "border-radius: 8px",
      "font-size: 13px",
      "white-space: nowrap",
    ].join("; ")
    document.body.appendChild(ghost)
    return ghost
  },
})
```

The browser uses the returned element as the drag ghost. It is your responsibility to ensure the element is in the DOM before returning it.

## Long Press Before Drag

By default dragging starts on the first `pointerdown`. For lists where items are also tappable (contain buttons, links, toggles), require a press-and-hold before the drag initiates:

```ts
dragDrop(items, {
  longPress: true,
  longPressDuration: 500,       // ms — how long to hold (default ~500)
  longPressClass: "is-holding", // class applied to item during hold
})
```

Style the holding state:

```ts
const sheet = document.createElement("style")
sheet.textContent = `.is-holding { transform: scale(1.04); transition: transform 0.2s; }`
document.head.appendChild(sheet)
```

A tap shorter than `longPressDuration` passes through as a normal click event on the item.
