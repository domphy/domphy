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
Animations are **enabled by default** — pass `animated: false` to disable.

```ts
const list = createVirtualizer(...)   // or just toState([...])
const App = {
  ul: (l) => items.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(items, config?)],
}
```

`dragDrop` calls `dragAndDrop()` from `@formkit/drag-and-drop` under the hood and patches:
- `_onMount(node)` — registers the container with animations plugin included
- `_onRemove()` — tears down listeners automatically

### `state` argument

Any object with `.get()` and `.set(updater)` methods (Domphy `State<T[]>` or custom). On reorder, FormKit calls `state.set(newArray)` so the reactive list re-renders.

### `config` (DragDropConfig)

`DragDropConfig<T>` extends `ParentConfig<T>` with one extra field:

```ts
interface DragDropConfig<T> extends Partial<ParentConfig<T>> {
  animated?: boolean   // default: true — enable sort animations
}
```

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
import { animations } from "@domphy/dnd"
```

### `animations(config?)`

Smooth CSS transitions for dragging and drop. **Included by default** in `dragDrop()` — you only need this if you use `dragAndDrop()` directly or set `animated: false`:

```ts
// Already animated — no extra step needed:
{ ul: ..., $: [dragDrop(items)] }

// Opt out of animations:
{ ul: ..., $: [dragDrop(items, { animated: false })] }

// Manual (if using dragAndDrop() directly):
{ ul: ..., $: [dragDrop(items, { plugins: [animations()] })] }
```

```ts
interface AnimationsConfig {
  duration?: number                     // ms, default 150
  easing?: string                       // CSS easing, default "ease"
  remapFinished?: boolean               // remap items to final positions after animation
}
```

### Drag handles via `handleClass`

`handleClass` is a config string key — not a plugin. Scope dragging to a handle element inside each item:

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

Items without a matching `.handle` element are not draggable by direct drag.

---

## Multi-list helpers

### `multiList(options)`

Convenience adapter for a single list participating in a named drag group.
All lists with the same `group` string accept transfers from each other.

```ts
import { multiList } from "@domphy/dnd"

const todo = toState<Task[]>([...])
const done = toState<Task[]>([...])

const TodoList = {
  ul: (l) => todo.get(l).map((t) => ({ li: t.text, _key: t.id })),
  $: [multiList({ group: "kanban", values: todo })],
}

const DoneList = {
  ul: (l) => done.get(l).map((t) => ({ li: t.text, _key: t.id })),
  $: [multiList({ group: "kanban", values: done })],
}
```

### `multiListGroup(group, states, config?)`

Shorthand when you have an array of lists — returns one patch per list:

```ts
import { multiListGroup } from "@domphy/dnd"

const [dropTodo, dropInProgress, dropDone] = multiListGroup("kanban", [todo, inProgress, done])

const Board = {
  div: [
    { ul: (l) => todo.get(l).map(...), $: [dropTodo] },
    { ul: (l) => inProgress.get(l).map(...), $: [dropInProgress] },
    { ul: (l) => done.get(l).map(...), $: [dropDone] },
  ],
}
```

---

## Transfer between lists (manual)

Two lists with the same `group` exchange items when an item is dragged from one to the other.
The `multiList`/`multiListGroup` helpers above do this automatically. Manual equivalent:

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
  animations,       // plugin: smooth CSS transitions
  insert,           // plugin: insert items at specific positions
  sort,             // plugin: sort-only (no transfer)
  transfer,         // plugin: transfer between lists
  dropOrSwap,       // drop zone: swap positions instead of shift
  parentValues,     // get current values from a parent element
  setParentValues,  // programmatically update a parent's values
  nodes,            // map of all registered node elements
  parents,          // map of all registered parent elements
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
