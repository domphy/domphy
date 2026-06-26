---
title: "API Reference"
description: "dragDrop adapter, configuration, plugins, multi-list transfer, and FormKit drag-and-drop API."
---

# API Reference

## `dragDrop(state, config?)`

```ts
import { dragDrop } from "@domphy/dnd"
```

A Domphy patch applied via `$`. Wires the FormKit drag-and-drop engine to a reactive state array.

```ts
const list = createVirtualizer(...)   // or just toState([...])
const App = {
  ul: (l) => items.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(items, config?)],
}
```

`dragDrop` calls `dragAndDrop()` from `@formkit/drag-and-drop` under the hood and patches:
- `_onMount(node)` — registers the container
- `_onRemove()` — tears down listeners automatically

### `state` argument

Any object with `.get()` and `.set(updater)` methods (Domphy `State<T[]>` or custom). On reorder, FormKit calls `state.set(newArray)` so the reactive list re-renders.

### `config` (ParentConfig)

```ts
interface ParentConfig<T> {
  // Transfer between lists
  group?: string                             // lists with same group can exchange items

  // Sorting
  sortable?: boolean                         // default: true
  lockAxis?: "x" | "y"                       // restrict drag direction

  // Handles
  draggable?: (el: HTMLElement) => boolean   // filter which children are draggable
  handleClass?: string                       // CSS class of drag handles inside items

  // Drop zone
  accepts?: (data: DragState<T>, parent: HTMLElement, currentParent: HTMLElement) => boolean

  // Thresholds
  threshold?: { horizontal: number; vertical: number }   // 0–1 (default 0.5)

  // Plugins
  plugins?: Plugin[]

  // Callbacks
  onDragstart?: (data: DragStartEventData<T>) => void
  onDragend?: (data: DragEndEventData<T>) => void
  onSort?: (data: SortEventData<T>) => void
  onTransfer?: (data: TransferEventData<T>) => void
}
```

---

## Plugins

Import plugins from `@domphy/dnd` (re-exported from `@formkit/drag-and-drop`):

```ts
import { animations, multiDrag, handleClass } from "@domphy/dnd"
```

### `animations(config?)`

Smooth CSS transitions for dragging and drop. No extra setup required:

```ts
{ ul: ..., $: [dragDrop(items, { plugins: [animations()] })] }
```

```ts
interface AnimationsConfig {
  duration?: number                     // ms, default 150
  easing?: string                       // CSS easing, default "ease"
  remapFinished?: boolean               // remap items to final positions after animation
}
```

### `multiDrag(config?)`

Allow selecting multiple items (hold `Shift` or `Ctrl/Cmd`) and dragging them together:

```ts
import { multiDrag, selections } from "@domphy/dnd"

const selectedItems = selections(items)   // tracks selected subset

const App = {
  ul: (l) => items.get(l).map((item) => ({
    li: item.label,
    _key: item.id,
    class: (l) => selectedItems.get(l).has(item.id) ? "selected" : "",
  })),
  $: [dragDrop(items, {
    plugins: [multiDrag({ selectedClass: "selected" })],
  })],
}
```

### `handleClass(className?)`

Scope dragging to a handle element inside each item. Items without a matching handle element are not draggable by direct drag — only by their handle:

```ts
{ ul: (l) => items.get(l).map((item) => ({
  _key: item.id,
  li: [
    { span: "⠿", class: "handle" },
    { span: item.label },
  ],
})),
$: [dragDrop(items, { handleClass: "handle" })] }
```

---

## Transfer between lists

Two lists with the same `group` exchange items when an item is dragged from one to the other. Both lists must use `group`:

```ts
const todo = toState<Task[]>([...])
const done = toState<Task[]>([...])

const TodoList = {
  ul: (l) => todo.get(l).map((t) => ({ li: t.text, _key: t.id })),
  $: [dragDrop(todo, { group: "kanban" })],
}

const DoneList = {
  ul: (l) => done.get(l).map((t) => ({ li: t.text, _key: t.id })),
  $: [dragDrop(done, { group: "kanban" })],
}
```

Use `accepts` to limit what can transfer in:

```ts
dragDrop(done, {
  group: "kanban",
  accepts: (data) => data.targetParentValues.every((t) => t.status === "todo"),
})
```

---

## Sortable with server sync

Wire `onSort` to persist new order after each drag:

```ts
dragDrop(items, {
  onSort: async ({ newValues }) => {
    await api.patch("/tasks/order", { ids: newValues.map((t) => t.id) })
  },
})
```

---

## Drag state types

```ts
interface DragStartEventData<T> {
  values: T[]           // items being dragged
  parent: HTMLElement
}

interface DragEndEventData<T> {
  values: T[]           // items dropped
  parent: HTMLElement
  targetParent: HTMLElement | null
}

interface SortEventData<T> {
  newValues: T[]        // reordered list
  previousValues: T[]
  parent: HTMLElement
}

interface TransferEventData<T> {
  values: T[]           // items transferred
  sourceParent: HTMLElement
  targetParent: HTMLElement
  targetParentValues: T[]
  previousParentValues: T[]
}
```

---

## Low-level FormKit API

All `@formkit/drag-and-drop` exports are re-exported from `@domphy/dnd`:

```ts
import {
  dragAndDrop,      // low-level setup for a container element
  useDragAndDrop,   // framework-agnostic reactive helper
  selections,       // multi-select state helper
  swap,             // swap two elements without triggering full re-sort
  insert,           // insert at specific index
  multiDrag,
  animations,
  handleClass,
} from "@domphy/dnd"
```

See [FormKit drag-and-drop docs](https://drag-and-drop.formkit.com) for the full API surface. The `dragDrop` adapter is a thin wrapper — anything `dragAndDrop()` supports is available via `config`.

---

## Accessibility

FormKit drag-and-drop includes keyboard accessibility built in:

- `Tab` to focus an item
- `Space` to pick up / drop
- Arrow keys to move while picked up
- `Escape` to cancel

No additional setup required. ARIA roles (`role="listitem"`, `aria-grabbed`, `aria-dropeffect`) are applied automatically.
