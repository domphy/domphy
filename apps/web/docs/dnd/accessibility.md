---
title: "Accessibility"
description: "Keyboard alternatives, screen reader announcements, and touch accessibility in @domphy/dnd."
---

# Accessibility

`@domphy/dnd` wraps `@formkit/drag-and-drop`, whose engine is **pointer-based**. Keyboard drag-and-drop is not implemented upstream (`handleNodeKeydown` is an empty stub; the only built-in key handling is `Escape` clearing a multi-drag selection), and FormKit does not manage `tabindex`, `aria-grabbed`, or `aria-dropeffect` for you.

[WCAG 2.2 SC 2.5.7 (Dragging Movements, AA)](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) requires that everything a drag does can also be done without a dragging movement, and SC 2.1.1 requires the list be operable from the keyboard at all. `keyboardSort()` supplies both.

## `keyboardSort()` — the keyboard path

Apply the sorter to each item; it makes the item focusable, handles pick-up / move / drop / cancel, and announces every step. It writes the **same** state the drag engine writes, so pointer and keyboard reorders stay in sync:

```ts
import { toState } from "@domphy/core"
import { dragDrop, keyboardSort } from "@domphy/dnd"

type Task = { id: number; title: string }

const tasks = toState<Task[]>([
  { id: 1, title: "Write specs" },
  { id: 2, title: "Build feature" },
  { id: 3, title: "Review PR" },
])

const sortTask = keyboardSort(tasks, { label: (task) => task.title })

const App = {
  ul: (l) =>
    tasks.get(l).map((task, index) => ({
      li: task.title,
      _key: task.id,
      $: [sortTask(index)],
    })),
  $: [dragDrop(tasks)],
}
```

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | move focus to an item |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | pick the item up, then drop it |
| <kbd>↑</kbd> <kbd>↓</kbd> | move the held item one position |
| <kbd>Home</kbd> / <kbd>End</kbd> | move it to the first or last position |
| <kbd>Esc</kbd> | cancel and restore the original order |

Focus follows the item as it moves, so a screen reader user never loses their place.

### Styling the held item

The sorter sets `data-grabbed="true"` on the item while it is held, and leaves the element's own semantics alone (an `<li>` stays a listitem, so its `<ul>` stays a valid list). Give it a visible held state and a focus ring:

```ts
const sheet = document.createElement("style")
sheet.textContent = `
  li:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  li[data-grabbed="true"] {
    outline: 2px dashed currentColor;
    outline-offset: 2px;
  }
`
document.head.appendChild(sheet)
```

### Across lists

`keyboardSortGroup()` is the keyboard counterpart of `multiListGroup()` — one sorter per list, sharing one held-item session. <kbd>←</kbd> / <kbd>→</kbd> move the held item to the previous / next list, and <kbd>Esc</kbd> unwinds a cross-list move as well:

```ts
const [dropTodo, dropDone] = multiListGroup("kanban", [todo, done])
const [sortTodo, sortDone] = keyboardSortGroup([todo, done], {
  label: (task) => task.title,
  listLabel: (index) => (index === 0 ? "To Do" : "Done"),
})

const Board = {
  div: [
    {
      ul: (l) =>
        todo.get(l).map((task, index) => ({
          li: task.title,
          _key: task.id,
          $: [sortTodo(index)],
        })),
      $: [dropTodo],
      ariaLabel: "To Do column",
    },
    {
      ul: (l) =>
        done.get(l).map((task, index) => ({
          li: task.title,
          _key: task.id,
          $: [sortDone(index)],
        })),
      $: [dropDone],
      ariaLabel: "Done column",
    },
  ],
}
```

### Rolling your own

If you need different keys or your own bookkeeping, reorder the bound state from your own `onKeyDown` and leave the sorter off that item — Domphy chains event handlers, so an item's own handler runs *in addition to* the sorter's, it does not replace it. The low-level `performSort` / `performTransfer` functions (for updating the engine's state mid-drag) are re-exported from `@domphy/dnd`.

## Announcing Pointer Drags to Screen Readers

`keyboardSort()` announces keyboard moves. FormKit does not announce **pointer** drags — add an ARIA live region and update it in `onSort` and `onTransfer`:

```ts
import { toState } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"
import { themeColor, themeSpacing } from "@domphy/theme"

type Task = { id: number; title: string }

const tasks = toState<Task[]>([
  { id: 1, title: "Write specs" },
  { id: 2, title: "Build feature" },
  { id: 3, title: "Review PR" },
])

const announcement = toState("")

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
  $: [
    dragDrop(tasks, {
      onSort: ({ values, previousPosition, position }) => {
        const moved = values[position] as Task
        announcement.set(
          `"${moved.title}" moved from position ${previousPosition + 1} to ${position + 1} of ${values.length}.`,
        )
      },
      onTransfer: ({ draggedNodes, targetParent }) => {
        const names = draggedNodes.map((n) => (n.data.value as Task).title).join(", ")
        announcement.set(`Transferred ${names} to ${targetParent.el.getAttribute("aria-label") ?? "another list"}.`)
      },
    }),
  ],
  style: { listStyle: "none", padding: "0" },
}

// Invisible ARIA live region — screen readers announce changes politely.
const LiveRegion = {
  div: (l) => announcement.get(l),
  ariaLive: "polite",
  ariaAtomic: "true",
  style: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: "0",
  },
}

const App = {
  div: [TaskList, LiveRegion],
}
```

`onSort` receives `previousPosition` and `position` (both zero-based). Add 1 when building a human-readable message.

## Touch and Long Press

On touch devices, drag starts immediately on `pointerdown`. For lists where items are also tappable, use `longPress` to require a sustained hold before the drag initiates:

```ts
dragDrop(tasks, {
  longPress: true,
  longPressDuration: 500,
  longPressClass: "is-holding",
})
```

```ts
const sheet = document.createElement("style")
sheet.textContent = `
  .is-holding {
    transform: scale(1.05);
    transition: transform 0.2s;
    box-shadow: 0 4px 16px rgba(0,0,0,.15);
  }
`
document.head.appendChild(sheet)
```

A normal tap (less than `longPressDuration` ms) fires click events as usual; a sustained press initiates the drag.

## Reduced Motion

`dragDrop()` enables animations by default. Disable them for users who prefer reduced motion:

```ts
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

dragDrop(tasks, {
  animated: !reducedMotion,
})
```

## Column Labels for Screen Readers

In multi-container layouts, add `aria-label` to each list container. The transfer announcement above reads it via `targetParent.el.getAttribute("aria-label")`:

```ts
const TodoColumn = {
  ul: (l) => todo.get(l).map((t) => ({ li: t.title, _key: t.id })),
  $: [dragDrop(todo, { group: "kanban" })],
  ariaLabel: "To Do column",
  role: "list",
}

const DoneColumn = {
  ul: (l) => done.get(l).map((t) => ({ li: t.title, _key: t.id })),
  $: [dragDrop(done, { group: "kanban" })],
  ariaLabel: "Done column",
  role: "list",
}
```
