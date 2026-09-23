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
import { toState } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"

const items = toState([
  { id: "a", label: "A" },
  { id: "b", label: "B" },
])
const App = {
  ul: (l) => items.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(items)],
}
```

`dragDrop` registers the container via a per-node `behavior()` instance (`@domphy/core`): `attach` runs `dragAndDrop()` once per real DOM node (animations plugin included by default), later factory re-runs on a reused node route the new `state`/`config` into that same instance via `update()`, and `destroy` tears down listeners, disconnects FormKit's setup MutationObserver, and drops the parent from FormKit's `parents` registry. Do not wire FormKit from `_onMount`/`_onRemove` — those hooks fire only for generation 1 on a reused node.

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
  name?: string                              // label for accepts() specificity

  // Sorting
  sortable?: boolean                         // default: true

  // Drag start
  disabled?: boolean                         // disable all dragging in this list
  nativeDrag?: boolean                       // use native HTML5 drag API (default: true)
  multiDrag?: boolean                        // allow Shift/Ctrl multi-select before drag

  // Handles
  draggable?: (el: HTMLElement) => boolean   // filter which children are draggable
  draggableValue?: (value: T) => boolean     // same filter but receives the item value
  dragHandle?: string                        // CSS selector for drag handle inside each item
  externalDragHandle?: {                     // handle element outside the list item
    el: HTMLElement
    callback: () => HTMLElement
  }

  // Drop zone
  accepts?: (
    targetParent: ParentRecord<T>,           // the list being dragged over
    initialParent: ParentRecord<T>,          // the list where the drag started
    currentParent: ParentRecord<T>,          // the list most recently hovered
    state: BaseDragState<T>                  // raw drag state
  ) => boolean
  dropZone?: boolean                         // treat the parent element itself as a drop zone

  // CSS classes applied during drag phases
  draggingClass?: string           // added to the element being dragged
  dropZoneClass?: string           // added to a valid drop zone parent
  dropZoneParentClass?: string     // added to the parent of the active drop zone
  selectedClass?: string           // added to items in a multi-drag selection
  synthDraggingClass?: string      // synthesized drag indicator (non-native drag)
  synthDropZoneClass?: string
  synthDropZoneParentClass?: string
  longPressClass?: string          // added while long press is pending

  // Long press (touch devices)
  longPress?: boolean              // enable long-press-to-drag (default: false)
  longPressDuration?: number       // ms before drag starts (default: 1000)

  // Custom drag image
  dragImage?: (data: NodeDragEventData<T>, draggedNodes: NodeRecord<T>[]) => void

  // Thresholds
  threshold?: { horizontal: number; vertical: number }   // fraction 0–1 (default { horizontal: 0, vertical: 0 })

  // Plugins
  plugins?: DNDPlugin[]

  // Callbacks
  onDragstart?: (data: DragstartEventData<T>) => void
  onDragend?: (data: DragendEventData<T>) => void
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

// Custom animation config — disable default, pass explicit plugin:
{ ul: ..., $: [dragDrop(items, { animated: false, plugins: [animations({ duration: 200 })] })] }
```

```ts
interface AnimationsConfig {
  duration?: number          // ms; default 150
  easing?: string            // CSS easing; default "ease-in-out"
  remapFinished?: () => void // callback invoked after nodes finish remapping
  yScale?: number            // Y-axis scale factor during animation
  xScale?: number            // X-axis scale factor during animation
}
```

### Drag handles via `dragHandle`

`dragHandle` is a CSS selector config key — not a plugin. Scope dragging to a handle element inside each item:

```ts
{ ul: (l) => items.get(l).map((item) => ({
  _key: item.id,
  li: [
    { span: "⠿", class: "handle" },
    { span: item.label },
  ],
})),
$: [dragDrop(items, { dragHandle: ".handle" })] }
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

## Keyboard reorder

### `keyboardSort(state, options?)`

Returns `(index) => PartialElement` — apply the result to each item via `$`.
Gives the list a keyboard path to everything the pointer drag does, which
[WCAG 2.2 SC 2.5.7 (Dragging Movements)](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
requires, since the FormKit engine is pointer-only.

```ts
import { dragDrop, keyboardSort } from "@domphy/dnd"

const sortItem = keyboardSort(items)

const List = {
  ul: (l) =>
    items.get(l).map((item, index) => ({
      li: item.label,
      _key: item.id,
      $: [sortItem(index)],
    })),
  $: [dragDrop(items)],
}
```

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | move focus to an item |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | pick the item up, then drop it |
| <kbd>↑</kbd> <kbd>↓</kbd> | move the held item one position |
| <kbd>←</kbd> <kbd>→</kbd> | move one position (single list) / move to the previous or next list (group) |
| <kbd>Home</kbd> / <kbd>End</kbd> | move the held item to the first or last position |
| <kbd>Esc</kbd> | cancel and restore the original order |

It writes the same `State<T[]>` the pointer engine writes, so pointer and
keyboard reorders stay in sync with no extra wiring.

```ts
interface KeyboardSortOptions<T> {
  label?: (item: T, index: number) => string      // announcement name; default: the item's text content
  listLabel?: (listIndex: number) => string       // used in cross-list announcements; default: "list N"
}
```

Applied to each item: `tabindex="0"`, `aria-roledescription="sortable item"`,
`aria-describedby` pointing at a shared instructions node, and
`data-grabbed="true"` while the item is held — style the held state from that
attribute. An item's own `tabIndex` overrides the patch's, but an own
`onKeyDown` does **not** replace the sorter's — Domphy chains event handlers,
so both run (the patch's first). To own the keys entirely, do not apply the
sorter to that item. While an item is held the sorter calls `preventDefault()`
and `stopPropagation()` on the keys it consumes, so Escape cancels the move
instead of closing an enclosing dialog.

Each step is announced through a visually-hidden `aria-live="assertive"`
region appended to `<body>` on first use (DOM-guarded, so SSR renders stay
DOM-free).

Every arrow press is a committed move — the state is written and announced at
each step — so focus leaving the held item (<kbd>Tab</kbd>, a click elsewhere)
releases it where it stands rather than reverting. <kbd>Esc</kbd> is the undo.

### `keyboardSortGroup(states, options?)`

The keyboard counterpart of `multiListGroup` — returns one sorter per list,
sharing one held-item session, so <kbd>←</kbd>/<kbd>→</kbd> move the held item
between lists and <kbd>Esc</kbd> unwinds a cross-list move too.

```ts
const [dropTodo, dropDone] = multiListGroup("kanban", [todo, done])
const [sortTodo, sortDone] = keyboardSortGroup([todo, done])
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
  // Only accept items coming from the "todo" column.
  accepts: (_target, initialParent) => initialParent.el.id === "col-todo",
})
```

---

## Sortable with server sync

Wire `onSort` to persist new order after each drag:

```ts
dragDrop(items, {
  onSort: async ({ values }) => {
    await api.patch("/tasks/order", { ids: values.map((t) => t.id) })
  },
})
```

---

## Drag state types

These are the exact types from `@formkit/drag-and-drop` (re-exported from `@domphy/dnd`).

```ts
// Fired when a drag starts (native or synthetic pointer drag).
interface DragstartEventData<T> {
  parent: ParentRecord<T>         // the list containing the dragged item
  values: T[]                     // current ordered values of that list
  draggedNode: NodeRecord<T>      // the primary dragged DOM node
  draggedNodes: NodeRecord<T>[]   // all dragged nodes (>1 in multi-drag)
  position: number                // starting index of the dragged item
  state: BaseDragState<T>
}

// Fired when a drag ends (drop or cancel).
interface DragendEventData<T> {
  parent: ParentRecord<T>         // the list where the item landed
  values: T[]                     // final ordered values of that list
  draggedNode: NodeRecord<T>
  draggedNodes: NodeRecord<T>[]
  state: BaseDragState<T>
}

// Fired after a reorder within a single list.
interface SortEventData<T> {
  parent: ParentRecord<T>
  previousValues: T[]             // order before the sort
  values: T[]                     // order after the sort
  previousNodes: NodeRecord<T>[]
  nodes: NodeRecord<T>[]
  draggedNodes: NodeRecord<T>[]
  targetNodes: NodeRecord<T>[]
  previousPosition: number        // index before move (0-based)
  position: number                // index after move (0-based)
  state: BaseDragState<T>
}

// Fired after an item crosses from one list to another.
interface TransferEventData<T> {
  sourceParent: ParentRecord<T>   // list the item came from
  targetParent: ParentRecord<T>   // list the item went to
  initialParent: ParentRecord<T>  // list where the drag first started
  draggedNodes: NodeRecord<T>[]
  targetNodes: NodeRecord<T>[]
  targetIndex: number             // insertion index in the target list
  state: BaseDragState<T>
}
```

`ParentRecord<T>` exposes `{ el: HTMLElement; data: ParentData<T> }` — access `el` for the DOM node and `data.getValues(el)` for the current values. `NodeRecord<T>` exposes `{ el: Node; data: NodeData<T> }` — access `data.value` for the item value.

---

## Low-level FormKit API

All `@formkit/drag-and-drop` exports are re-exported from `@domphy/dnd`:

```ts
import {
  dragAndDrop,      // low-level setup for a container element
  animations,       // plugin: smooth CSS transitions
  insert,           // plugin: insert items with a drop indicator
  dropOrSwap,       // plugin: swap positions instead of shift-sort
  updateConfig,     // update a mounted parent's config without remounting
  parentValues,     // get current values from a parent element
  setParentValues,  // programmatically update a parent's values
  sort,             // low-level sort utility (moves nodes in state)
  transfer,         // low-level transfer utility (moves nodes between parents)
  nodes,            // WeakMap of all registered draggable node elements
  parents,          // WeakMap of all registered parent container elements
  tearDown,         // remove FormKit listeners from a parent element
} from "@domphy/dnd"
```

See [FormKit drag-and-drop docs](https://drag-and-drop.formkit.com) for the full API surface. The `dragDrop` adapter is a thin wrapper — anything `dragAndDrop()` supports is available via `config`.

---

## Accessibility

The engine is pointer-based — keyboard drag-and-drop is **not** implemented upstream (`handleNodeKeydown` is an empty stub; the only built-in key handling is `Escape` clearing a multi-drag selection), and no `aria-grabbed`/`aria-dropeffect`/`tabindex` attributes are applied automatically. `keyboardSort()` / `keyboardSortGroup()` (above) supply the keyboard path — see [Accessibility](./accessibility).
