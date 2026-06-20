# @domphy/dnd

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/dnd/) · [npm](https://www.npmjs.com/package/@domphy/dnd)

Drag & drop and sortable lists for Domphy: reorder, transfer between lists, multi-drag, keyboard accessibility, and drop animations.

Unlike the other `@domphy/*` data packages (which are byte-identical TanStack core ports), drag-and-drop has no portable framework-agnostic core to copy — so this package **depends on** [`@formkit/drag-and-drop`](https://drag-and-drop.formkit.com) (MIT, zero-dependency, framework-agnostic) and adds a thin Domphy adapter. That is exactly how FormKit's own React/Vue/Solid adapters work; `@domphy/dnd` is the Domphy adapter. The full FormKit API is re-exported.

## Install

```bash
npm install @domphy/dnd @domphy/core
```

`@domphy/core` is a peer dependency.

## Usage

Apply `dragDrop(state, config?)` to the list container via `$`, and render the children reactively from the **same** state with a stable `_key` per item:

```ts
import { toState, type DomphyElement } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"

const items = toState([
  { id: 1, label: "Write docs" },
  { id: 2, label: "Ship it" },
  { id: 3, label: "Celebrate" },
])

const App: DomphyElement<"ul"> = {
  ul: (l) =>
    items.get(l).map((item) => ({
      li: item.label,
      _key: item.id, // stable identity is required for reorder
    })),
  $: [dragDrop(items)],
}
```

Dragging reorders the DOM, calls FormKit's `setValues` → updates `items` → Domphy re-renders the keyed children in the new order.

## Config & plugins

`dragDrop(state, config)` forwards `config` to FormKit's `ParentConfig` — and the whole FormKit API (plugins like `animations`, `insert`, `dropOrSwap`, group transfer, sensors) is re-exported from `@domphy/dnd`:

```ts
import { dragDrop, animations } from "@domphy/dnd"

{ ul: (l) => ..., $: [dragDrop(items, { plugins: [animations()], group: "todos" })] }
```

Transfer between lists: give two lists the same `group`. Reorder/transfer behaviour, accessibility and touch handling come from FormKit — see the [FormKit DnD docs](https://drag-and-drop.formkit.com).

## Cleanup

The adapter tears down FormKit's listeners on `_onRemove` automatically.
