---
title: "Accessibility"
description: "Keyboard alternatives, screen reader announcements, and touch accessibility in @domphy/dnd."
---

# Accessibility

`@domphy/dnd` wraps `@formkit/drag-and-drop`, whose engine is **pointer-based**. Keyboard drag-and-drop is not implemented upstream (`handleNodeKeydown` is an empty stub; the only built-in key handling is `Escape` clearing a multi-drag selection), and FormKit does not manage `tabindex`, `aria-grabbed`, or `aria-dropeffect` for you. This page shows how to build the keyboard alternative yourself.

## Keyboard Alternative: Reorder the State

The supported pattern is to make items focusable and reorder the bound state from a key handler. Because Domphy re-renders the keyed children from the same state the drag engine writes to, a keyboard reorder and a pointer drag stay in sync automatically:

```ts
import { toState } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"

type Task = { id: number; title: string }

const tasks = toState<Task[]>([
  { id: 1, title: "Write specs" },
  { id: 2, title: "Build feature" },
  { id: 3, title: "Review PR" },
])

const announcement = toState("")

// Move the item at `index` by `delta` (-1 up, +1 down) and announce it.
function move(index: number, delta: number) {
  const list = tasks.get()
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const next = list.slice()
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  tasks.set(next)
  announcement.set(
    `"${item.title}" moved to position ${target + 1} of ${next.length}.`,
  )
}

const App = {
  div: [
    {
      ul: (l) =>
        tasks.get(l).map((task, index) => ({
          li: task.title,
          _key: task.id,
          tabindex: "0", // <li> is not natively focusable — add it yourself
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") {
              e.preventDefault()
              move(index, -1)
            } else if (e.key === "ArrowDown") {
              e.preventDefault()
              move(index, 1)
            }
          },
        })),
      $: [dragDrop(tasks)],
      role: "list",
    },
    {
      // Invisible ARIA live region — screen readers announce reorders politely.
      div: (l) => announcement.get(l),
      ariaLive: "polite",
      ariaAtomic: "true",
    },
  ],
}
```

The same approach works between lists: move the item between the two state arrays. If you need the engine's own bookkeeping updated instead (e.g. mid-drag), the low-level `performSort` / `performTransfer` functions are re-exported from `@domphy/dnd`.

Add a focus-visible ring in a stylesheet so the focused item is visible:

```ts
const sheet = document.createElement("style")
sheet.textContent = `
  li:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`
document.head.appendChild(sheet)
```

## Announcing Reorders to Screen Readers

FormKit does not automatically announce sort results to screen readers. Add an ARIA live region and update it in `onSort` and `onTransfer`:

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
