---
title: "Sortable List"
description: "Build vertically and horizontally sortable lists with @domphy/dnd. Full walkthrough with grids, thresholds, server persistence, and pinned items."
---

# Sortable List

The core use of `@domphy/dnd` is a list whose items can be dragged to a new position. This page covers vertical and horizontal layouts, grids, sort thresholds, server persistence, and pinned (non-draggable) items.

## Minimal Vertical List

Apply `dragDrop(state)` via `$` on the list container. Render children reactively from the **same** state and give every child a stable `_key`:

```ts
import { toState } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"
import { themeColor, themeSpacing } from "@domphy/theme"

const tasks = toState([
  { id: 1, title: "Design system" },
  { id: 2, title: "Write tests" },
  { id: 3, title: "Deploy staging" },
])

const TaskList = {
  ul: (l) =>
    tasks.get(l).map((task) => ({
      li: task.title,
      _key: task.id,
      style: {
        padding: themeSpacing(3),
        marginBottom: themeSpacing(2),
        backgroundColor: (cl) => themeColor(cl, "shift-2"),
        borderRadius: themeSpacing(2),
        cursor: "grab",
        userSelect: "none",
      },
    })),
  $: [dragDrop(tasks)],
  style: { listStyle: "none", padding: "0" },
}
```

When a user drops an item in a new position, FormKit calls `tasks.set(newOrder)`. Domphy's keyed diff re-renders only the moved items.

::: warning `_key` is required
Without a stable key Domphy cannot match DOM nodes to their positions after a reorder. Use the item's unique ID — never the array index.
:::

## Reading the Current Order

Because `tasks` is a reactive state, read it anywhere in the same tree:

```ts
const App = {
  div: [
    TaskList,
    {
      p: (l) =>
        `Order: ${tasks.get(l).map((t) => t.id).join(" → ")}`,
      style: { marginTop: themeSpacing(3) },
    },
  ],
}
```

The paragraph re-renders automatically after each drop.

## Grid Layout

A grid is just a list with `display: grid`. `dragDrop` treats it as a flat array — dragging reorders the state, and the grid appearance is purely CSS:

```ts
const cards = toState([
  { id: 1, title: "Card A" },
  { id: 2, title: "Card B" },
  { id: 3, title: "Card C" },
  { id: 4, title: "Card D" },
  { id: 5, title: "Card E" },
  { id: 6, title: "Card F" },
])

const CardGrid = {
  ul: (l) =>
    cards.get(l).map((card) => ({
      li: card.title,
      _key: card.id,
      style: {
        padding: themeSpacing(4),
        backgroundColor: (cl) => themeColor(cl, "shift-2"),
        borderRadius: themeSpacing(2),
        textAlign: "center",
        cursor: "grab",
        userSelect: "none",
      },
    })),
  $: [dragDrop(cards)],
  style: {
    listStyle: "none",
    padding: "0",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: themeSpacing(3),
  },
}
```

No extra config is needed. The `threshold` option controls how far into a cell the cursor must travel before the swap fires.

## Adjusting the Sort Threshold

By default a sort triggers when the cursor crosses 50 % of a target item. Tighten this for compact items or grids:

```ts
dragDrop(cards, {
  threshold: { horizontal: 0.3, vertical: 0.3 },
})
```

Values are fractions of the target's width/height (0 to 1).

## Disabling Sort Within a List

Set `sortable: false` to prevent reordering inside the list while still allowing items to arrive from other lists in the same `group`:

```ts
{
  ul: (l) => items.get(l).map(...),
  $: [dragDrop(items, { sortable: false, group: "board" })],
}
```

## Persisting Order to a Server

Wire `onSort` to flush each reorder:

```ts
dragDrop(tasks, {
  onSort: async ({ values }) => {
    await fetch("/api/tasks/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: values.map((t) => t.id) }),
    })
  },
})
```

`values` is the new ordered array after the sort. To roll back on failure, capture a snapshot in `onDragstart`:

```ts
type Task = { id: number; title: string }
let snapshot: Task[] = []

dragDrop(tasks, {
  onDragstart: ({ values }) => {
    snapshot = [...values] as Task[]
  },
  onSort: async ({ values }) => {
    try {
      await fetch("/api/tasks/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: (values as Task[]).map((t) => t.id) }),
      })
    } catch {
      tasks.set(snapshot)
    }
  },
})
```

## Pinning Specific Items

The `draggable` callback receives each child's DOM element; return `false` to prevent that item from being dragged.

First, stamp a `data-id` attribute onto each item:

```ts
tasks.get(l).map((task) => ({
  li: task.title,
  _key: task.id,
  dataId: String(task.id),
  style: {
    padding: themeSpacing(3),
    marginBottom: themeSpacing(2),
    backgroundColor: (cl) => themeColor(cl, "shift-2"),
    borderRadius: themeSpacing(2),
    cursor: task.pinned ? "default" : "grab",
    opacity: task.pinned ? "0.5" : "1",
    userSelect: "none",
  },
}))
```

Then filter in the config:

```ts
const pinned = new Set([1, 2]) // IDs that should not move

dragDrop(tasks, {
  draggable: (el) => !pinned.has(Number(el.dataset.id)),
})
```

Non-draggable items remain in position; other items sort around them.

If your decision is purely data-based you can use `draggableValue` instead, which receives the item value directly without needing a DOM attribute:

```ts
dragDrop(tasks, {
  draggableValue: (task) => !(task as { pinned?: boolean }).pinned,
})
```
