<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import sortablejs from "../demos/integrations/sortablejs.ts?raw"
</script>

# SortableJS

Install SortableJS separately — Domphy does not wrap it.

```bash
npm install sortablejs
```

## Live Example

<CodeEditor :code="sortablejs" />

## Pattern

SortableJS handles drag-and-drop reordering directly in the DOM. Domphy manages the logical children list. The bridge is `children.move(oldIndex, newIndex, false)` — the `false` tells Domphy not to touch the DOM because SortableJS already moved the element.

```ts
import Sortable from "sortablejs"
import { toState, type DomphyElement } from "@domphy/core"

const items = toState([
    { id: 1, name: "Item A" },
    { id: 2, name: "Item B" },
    { id: 3, name: "Item C" },
])

const List: DomphyElement<"ul"> = {
    ul: (listener) => items.get(listener).map((item) => ({
        li: item.name,
        _key: item.id,
    })),
    _onMount: (node) => {
        Sortable.create(node.el, {
            onEnd(evt) {
                // SortableJS already moved the DOM node.
                // Pass false to sync the logical tree without touching the DOM again.
                node.children.move(evt.oldIndex!, evt.newIndex!, false)
            },
        })
    },
}
```

## Syncing state after drag

If you need to read the new order back into a state (e.g. to persist to the server), read `children` after the move:

```ts
onEnd(evt) {
    node.children.move(evt.oldIndex!, evt.newIndex!, false)

    // Read current logical order and sync back to state (silent — no re-render needed)
    const newOrder = node.children.map((child) => child.input as { id: number; name: string })
    items.set(newOrder)
}
```

## Updating from code

When the list changes from outside (server update, filter, sort), update `items` state normally. Domphy re-renders the DOM. SortableJS picks up the new DOM automatically — no extra work needed.

```ts
// Server pushed a new order — just set state, Domphy handles the DOM
items.set(newItemsFromServer)
```

If you update `children` directly via `children.update()` and SortableJS has already moved the DOM for some other reason, pass `false` to skip the DOM update:

```ts
node.children.update(newInputs, false)
```

## Key points

- `onEnd` fires after SortableJS moves the DOM — call `children.move(old, new, false)` to sync the logical tree only
- `false` as the third argument to `move()` means "do not touch the DOM"
- State reads after `move()` reflect the new order immediately
- Normal state updates (`items.set(...)`) go through Domphy's render as usual — SortableJS adapts to the new DOM

