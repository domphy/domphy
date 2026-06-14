<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Basic from "../demos/dnd/basic.ts?raw"
</script>

# Drag & Drop

`@domphy/dnd` adds sortable lists and drag & drop to Domphy: reorder, transfer between lists, multi-drag, keyboard accessibility, and drop animations.

Unlike the TanStack ports (`query`/`table`/`router`/`virtual`/`form`), drag-and-drop has no portable framework-agnostic core to copy byte-for-byte. So this package **depends on** [`@formkit/drag-and-drop`](https://drag-and-drop.formkit.com) (MIT, zero-dependency, framework-agnostic) and adds a thin Domphy adapter — the same way FormKit's own React/Vue/Solid adapters wrap the engine. The full FormKit API is re-exported.

## Install

::: code-group
```bash [NPM]
npm install @domphy/dnd @domphy/core
```
```html [CDN]
<script src="https://unpkg.com/@domphy/dnd/dist/dnd.global.js"></script>
```
:::

`@domphy/core` is a peer dependency.

## Live Example

<CodeEditor :code="Basic" />

## Usage

Apply `dragDrop(state, config?)` to the list container with `$`, and render the children reactively from the **same** state with a stable `_key`:

```ts
import { toState } from "@domphy/core"
import { dragDrop } from "@domphy/dnd"

const items = toState([
  { id: 1, label: "Write docs" },
  { id: 2, label: "Ship it" },
])

const App = {
  ul: (l) => items.get(l).map((item) => ({ li: item.label, _key: item.id })),
  $: [dragDrop(items)],
}
```

Dragging reorders the DOM, FormKit calls `setValues` → the `items` state updates → Domphy re-renders the keyed children in the new order. The `_key` is required so the reorder maps to the right nodes.

## Config & plugins

`dragDrop(state, config)` forwards `config` to FormKit's `ParentConfig`, and the whole FormKit API (plugins, sensors, group transfer) is re-exported:

```ts
import { dragDrop, animations } from "@domphy/dnd"

// drop animations + transfer items between any lists sharing a group
{ ul: (l) => ..., $: [dragDrop(items, { plugins: [animations()], group: "todos" })] }
```

Give two lists the same `group` to transfer items between them. Accessibility, touch and synthetic-drag handling come from FormKit — see the [FormKit DnD docs](https://drag-and-drop.formkit.com) for the full config.

## Cleanup

The adapter tears down FormKit's listeners automatically on removal (`_onRemove`).
