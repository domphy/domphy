# @domphy/dnd

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/dnd/) · [npm](https://www.npmjs.com/package/@domphy/dnd)

Drag & drop and sortable lists for Domphy: reorder, transfer between lists, multi-drag, and drop animations.

This package **depends on** [`@formkit/drag-and-drop`](https://drag-and-drop.formkit.com) (MIT, zero-dependency, framework-agnostic) and adds a thin Domphy adapter — the same way FormKit's own React/Vue/Solid adapters wrap the engine. `@domphy/dnd` is the Domphy adapter. The full FormKit API is re-exported.

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

Transfer between lists: give two lists the same `group`. Reorder/transfer behaviour and touch handling come from FormKit — see the [FormKit DnD docs](https://drag-and-drop.formkit.com).

## Accessibility

The engine is **pointer-based** — keyboard drag-and-drop is not implemented upstream (FormKit's `handleNodeKeydown` is an empty stub; the only built-in key handling is `Escape` clearing a multi-drag selection), and FormKit sets no `aria-grabbed`/`aria-dropeffect`/`tabindex` attributes. For keyboard-operable reorder, make items focusable yourself and reorder the bound state from a key handler (`items.set(...)`) — Domphy re-renders the keyed children — or drive the re-exported programmatic API (`performSort`, `performTransfer`). Announce the result through an ARIA live region from the `onSort`/`onTransfer` config callbacks.

## Cleanup

The FormKit registration lives in a per-node `behavior()` instance; on element removal its `destroy` runs FormKit's `tearDown()` (aborting the parent-level listeners) and clears the entry from FormKit's `parents` registry. (Upstream `tearDown()` cannot disconnect the setup MutationObserver — no handle is exposed — but with the registry entry gone its callback no-ops.)
