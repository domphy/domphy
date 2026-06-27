---
title: "Multi-Container"
description: "Transfer items between multiple lists — Kanban columns, one-way queues, and conditional accept logic with @domphy/dnd."
---

# Multi-Container

Assign the same `group` string to two or more lists and items can be dragged between them. This is the building block for Kanban boards, inbox/done pairs, and tag pickers.

## Basic Two-Column Transfer

```ts
import { toState } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"
import { themeColor, themeSpacing } from "@domphy/theme"

type Task = { id: number; title: string }

const todo = toState<Task[]>([
  { id: 1, title: "Write specs" },
  { id: 2, title: "Set up CI" },
])

const done = toState<Task[]>([
  { id: 3, title: "Design mockups" },
])

const GROUP = "kanban"

function listElement(label: string, state: ReturnType<typeof toState<Task[]>>) {
  return {
    div: [
      { h3: label },
      {
        ul: (l) =>
          state.get(l).map((task) => ({
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
        $: [dragDrop(state, { group: GROUP })],
        style: {
          listStyle: "none",
          padding: "0",
          minHeight: themeSpacing(20),
        },
      },
    ],
    style: {
      flex: "1",
      padding: themeSpacing(4),
      backgroundColor: (l) => themeColor(l, "shift-1"),
      borderRadius: themeSpacing(3),
    },
  }
}

const App = {
  div: [
    listElement("To Do", todo),
    listElement("Done", done),
  ],
  style: {
    display: "flex",
    gap: themeSpacing(4),
  },
}
```

Each `toState` tracks its own column. When a task is dragged from one column to another, FormKit calls `setValues` on both the source and the target — the reactive states update and Domphy re-renders both columns.

::: tip Empty columns
Set a `minHeight` on the `<ul>` so an empty column still has a drop area. Without height there is no DOM surface to drop onto.
:::

## Three-Column Kanban

Add as many lists as needed — all with the same `group`:

```ts
const todo = toState<Task[]>([...])
const inProgress = toState<Task[]>([...])
const done = toState<Task[]>([...])

const App = {
  div: [
    listElement("To Do", todo),
    listElement("In Progress", inProgress),
    listElement("Done", done),
  ],
  style: { display: "flex", gap: themeSpacing(4) },
}
```

## Listening for Transfers

`onTransfer` fires on both the source and target lists when an item crosses a column boundary:

```ts
type TransferData<T> = {
  sourceParent: { el: HTMLElement; data: import("@domphy/dnd").ParentData<T> }
  targetParent: { el: HTMLElement; data: import("@domphy/dnd").ParentData<T> }
  draggedNodes: Array<{ el: Node; data: import("@domphy/dnd").NodeData<T> }>
}

dragDrop(done, {
  group: GROUP,
  onTransfer: ({ draggedNodes, sourceParent, targetParent }) => {
    console.log(
      "Transferred",
      draggedNodes.map((n) => (n.data.value as Task).title),
      "from",
      sourceParent.el.dataset.column,
      "to",
      targetParent.el.dataset.column,
    )
  },
})
```

## Restricting What Can Transfer

The `accepts` callback runs on the **target** list before a drop is committed. Return `false` to reject the incoming item:

```ts
// Only let tasks from the "todo" column enter the "done" column.
// accepts(targetParent, initialParent, currentParent, state)
dragDrop(done, {
  group: GROUP,
  accepts: (_target, initialParent) => {
    return initialParent.el.id === "col-todo"
  },
})
```

`initialParent` is the list where the drag started. `targetParent` is the list being dragged over. Both are `ParentRecord<T>` — access the DOM element via `.el` and the config/values via `.data`.

A more data-driven check using the values currently in the source list:

```ts
dragDrop(done, {
  group: GROUP,
  accepts: (_target, initialParent) => {
    const sourceTasks = initialParent.data.getValues(initialParent.el) as Task[]
    return sourceTasks.every((t) => t.status === "todo")
  },
})
```

## Preventing Items from Leaving a List

Set `sortable: false` on the target so received items cannot be reordered there, and add `accepts` on the source to block items from coming back:

```ts
const archive = toState<Task[]>([])
let archiveEl: HTMLElement | null = null

// Source: items can leave but cannot accept transfers
dragDrop(todo, {
  group: "archive",
  // The second argument is the list where the drag started — reject if it came from archive.
  accepts: (_target, initial) => initial.el !== archiveEl,
})

// Sink: receives items, keeps insertion order, never gives them back
const ArchiveList = {
  ul: (l) => archive.get(l).map((t) => ({ li: t.title, _key: t.id })),
  $: [dragDrop(archive, { group: "archive", sortable: false })],
  _onMount: (node) => {
    archiveEl = node.domElement as HTMLElement
  },
}
```

## Drop Zone Visual Feedback

Apply a class to the list container while it is being dragged over:

```ts
dragDrop(done, {
  group: GROUP,
  dropZoneParentClass: "list-active",
})
```

Because FormKit adds and removes this class directly on the DOM element (outside Domphy's render cycle), style it in a global stylesheet:

```ts
const sheet = document.createElement("style")
sheet.textContent = `.list-active { outline: 2px dashed currentColor; }`
document.head.appendChild(sheet)
```

`dropZoneClass` does the same but on the individual item being hovered over rather than the parent list.

## Disabling Sorting Within Columns

Set `sortable: false` per column to turn columns into pure drop zones where the only way items move is by dragging from another column:

```ts
function dropOnlyColumn(label: string, state: ReturnType<typeof toState<Task[]>>) {
  return listElement(label, state)
  // override $:
  // $: [dragDrop(state, { group: GROUP, sortable: false })]
}
```
