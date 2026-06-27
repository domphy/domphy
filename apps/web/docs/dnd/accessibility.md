---
title: "Accessibility"
description: "Keyboard drag-and-drop, ARIA attributes, screen reader announcements, and touch accessibility in @domphy/dnd."
---

# Accessibility

`@domphy/dnd` inherits the accessibility features built into `@formkit/drag-and-drop`. Keyboard navigation, ARIA attributes, and basic touch support work without any extra setup.

## Keyboard Navigation

FormKit attaches keyboard listeners automatically when `dragDrop` is applied. All standard patterns are supported:

| Key | Action |
|---|---|
| `Tab` | Move focus between list items |
| `Space` | Pick up the focused item (enter drag mode) |
| `Arrow Up` or `Arrow Left` | Move the held item one position earlier |
| `Arrow Down` or `Arrow Right` | Move the held item one position later |
| `Space` or `Enter` | Drop the item at the current position |
| `Escape` | Cancel the drag — item returns to its original position |

No configuration is required for any of these.

## ARIA Attributes

FormKit manages ARIA attributes on both the list and its items:

- `aria-grabbed="true"` — set on the item currently being dragged via keyboard
- `aria-dropeffect="move"` — set on the parent while an item is held

These values change dynamically as the user drags and drops, so screen readers receive live feedback.

## Making Items Keyboard-Focusable

Items must be keyboard-focusable for keyboard drag to work. Native list items (`<li>`) are focusable when FormKit sets `tabindex` on them. If you use a different element as the list item, ensure it is reachable:

```ts
tasks.get(l).map((task) => ({
  // <div> is not natively focusable — add tabindex.
  div: task.title,
  _key: task.id,
  tabindex: "0",
  role: "listitem",
  style: {
    padding: themeSpacing(3),
    marginBottom: themeSpacing(2),
    backgroundColor: (cl) => themeColor(cl, "shift-2"),
    borderRadius: themeSpacing(2),
    cursor: "grab",
    userSelect: "none",
  },
}))
```

Add a focus-visible ring in a stylesheet:

```ts
const sheet = document.createElement("style")
sheet.textContent = `
  [role="listitem"]:focus-visible {
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
