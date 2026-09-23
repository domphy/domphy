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

`dragDrop(state, config)` forwards `config` to FormKit's `ParentConfig` — and the whole FormKit API (plugins like `animations`, `insert`, `dropOrSwap`, group transfer) is re-exported from `@domphy/dnd`:

```ts
import { dragDrop, animations } from "@domphy/dnd"

{ ul: (l) => ..., $: [dragDrop(items, { plugins: [animations()], group: "todos" })] }
```

Transfer between lists: give two lists the same `group`. Reorder/transfer behaviour and touch handling come from FormKit — see the [FormKit DnD docs](https://drag-and-drop.formkit.com).

## Accessibility

The engine is **pointer-based** — keyboard drag-and-drop is not implemented upstream (FormKit's `handleNodeKeydown` is an empty stub; the only built-in key handling is `Escape` clearing a multi-drag selection), and FormKit sets no `aria-grabbed`/`aria-dropeffect`/`tabindex` attributes.

`keyboardSort()` supplies the keyboard path [WCAG 2.2 SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) requires. Apply it to each item; it writes the same state the drag engine writes, so pointer and keyboard reorders stay in sync:

```ts
import { dragDrop, keyboardSort } from "@domphy/dnd"

const sortItem = keyboardSort(items)

const App = {
  ul: (l) =>
    items.get(l).map((item, index) => ({
      li: item.label,
      _key: item.id,
      $: [sortItem(index)],
    })),
  $: [dragDrop(items)],
}
```

Space/Enter picks an item up and drops it, arrow keys move it, Home/End jump to the ends, Escape cancels and restores the original order. Focus follows the item; each step is announced through a visually-hidden `aria-live` region. `keyboardSortGroup(lists)` is the counterpart of `multiListGroup` — left/right arrows move the held item between lists.

Pointer drags are not announced by FormKit: add a live region and update it from the `onSort`/`onTransfer` callbacks.

`pnpm test:e2e` drives `keyboardSort()`/`keyboardSortGroup()` with real Tab/Space/Arrow/Escape in Chromium (Playwright) — jsdom (`pnpm test`) has no real focus/blur/scrollIntoView, so the keyboard path's actual browser behavior is only proven there. Not part of `pnpm test` / `pnpm -r test`.

## Cleanup

The FormKit registration lives in a per-node `behavior()` instance; on element removal its `destroy` runs FormKit's `tearDown()` (aborting the parent-level listeners), disconnects the setup MutationObserver FormKit never exposes a handle for, and clears the entry from FormKit's `parents` registry.
