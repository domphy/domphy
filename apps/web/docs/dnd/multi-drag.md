---
title: "Multi-Drag"
description: "Select multiple items and drag them as a group using config.multiDrag and selectedClass."
---

# Multi-Drag

Enable multi-drag with `config.multiDrag: true`. Users can then hold `Shift` or `Ctrl`/`Cmd` to build a selection, then drag the whole selection at once.

## Enabling Multi-Drag

Set `multiDrag: true` and supply a `selectedClass` so FormKit knows which CSS class marks a selected item:

```ts
import { toState } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"
import { themeColor, themeSpacing } from "@domphy/theme"

type File = { id: number; name: string }

const files = toState<File[]>([
  { id: 1, name: "report.pdf" },
  { id: 2, name: "notes.md" },
  { id: 3, name: "photo.jpg" },
  { id: 4, name: "data.csv" },
])

const FileList = {
  ul: (l) =>
    files.get(l).map((file) => ({
      li: file.name,
      _key: file.id,
      style: {
        padding: themeSpacing(3),
        marginBottom: themeSpacing(1),
        backgroundColor: (cl) => themeColor(cl, "shift-2"),
        borderRadius: themeSpacing(2),
        cursor: "grab",
        userSelect: "none",
      },
    })),
  $: [
    dragDrop(files, {
      multiDrag: true,
      selectedClass: "is-selected",
    }),
  ],
  style: { listStyle: "none", padding: "0" },
}
```

FormKit adds and removes `is-selected` on list item elements directly. Style it in a stylesheet:

```ts
const sheet = document.createElement("style")
sheet.textContent = `
  .is-selected {
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }
`
document.head.appendChild(sheet)
```

## How Selection Works

| Interaction | Effect |
|---|---|
| Click | Select only this item (deselect others) |
| `Shift` + Click | Extend selection from last-selected to here |
| `Ctrl` / `Cmd` + Click | Toggle this item, keep others |
| Drag a selected item | All selected items move together |
| `Escape` during drag | Cancel, return all items to original positions |

No custom event handlers are needed — FormKit manages selection state internally.

## Reactive Selected Count

FormKit tracks selection in DOM classes, not in Domphy state. To display a count or react to selection, listen to `onDragstart` and `onDragend`:

```ts
import { toState } from "@domphy/core"

const dragCount = toState(0)

dragDrop(files, {
  multiDrag: true,
  selectedClass: "is-selected",
  onDragstart: ({ draggedNodes }) => {
    dragCount.set(draggedNodes.length)
  },
  onDragend: () => {
    dragCount.set(0)
  },
})

const StatusBar = {
  p: (l) => {
    const n = dragCount.get(l)
    return n > 0 ? `Moving ${n} item${n === 1 ? "" : "s"}…` : ""
  },
}
```

## Multi-Drag with Group Transfer

`multiDrag: true` works across lists sharing a `group`. Selected items from one list move to another as a batch:

```ts
const listA = toState<File[]>([...])
const listB = toState<File[]>([])

const GROUP = "files"

const ListA = {
  ul: (l) =>
    listA.get(l).map((file) => ({
      li: file.name,
      _key: file.id,
    })),
  $: [
    dragDrop(listA, {
      group: GROUP,
      multiDrag: true,
      selectedClass: "selected",
    }),
  ],
}

const ListB = {
  ul: (l) =>
    listB.get(l).map((file) => ({
      li: file.name,
      _key: file.id,
    })),
  $: [
    dragDrop(listB, {
      group: GROUP,
      multiDrag: true,
      selectedClass: "selected",
    }),
  ],
}
```

Both lists must declare `multiDrag: true` and the same `selectedClass` for consistent visual feedback.

## Tracking Which Items Were Moved

`onSort` and `onTransfer` callbacks receive `draggedNodes` — the full array of nodes in the batch:

```ts
dragDrop(files, {
  multiDrag: true,
  selectedClass: "is-selected",
  onSort: ({ draggedNodes, values }) => {
    const movedTitles = draggedNodes.map((n) => (n.data.value as File).name)
    console.log("Reordered:", movedTitles, "new order:", values.map((f) => (f as File).name))
  },
})
```

## Styling the Drag Placeholder

While dragging, FormKit applies `draggingClass` to the original item locations. Add it to config and style it in a stylesheet:

```ts
dragDrop(files, {
  multiDrag: true,
  selectedClass: "is-selected",
  draggingClass: "is-dragging",
})
```

```ts
const sheet = document.createElement("style")
sheet.textContent = `
  .is-dragging  { opacity: 0.3; }
  .is-selected  { outline: 2px solid currentColor; }
`
document.head.appendChild(sheet)
```

## Long Press to Select on Touch

On touch devices, tapping immediately starts a drag. To let users tap-select items before dragging, combine `multiDrag` with `longPress`:

```ts
dragDrop(files, {
  multiDrag: true,
  selectedClass: "is-selected",
  longPress: true,
  longPressDuration: 500,
  longPressClass: "is-holding",
})
```

A normal tap (shorter than `longPressDuration`) toggles selection. A held press initiates the drag.
