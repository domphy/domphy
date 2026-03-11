<script setup lang="ts">
import DomphyPreview from "../preview/index.vue"
import Counting from "../demos/core/counting.js"
</script>

# Reactivity

Domphy uses listener-based reactivity. Any value can be a function that receives a `listener`. When a subscribed state changes, Domphy re-runs only that reactive part.

<img alt="Reactivity" src="/figures/reactivity.png" width="500" style="display:block;margin:auto" />

```ts
const count = toState(0)

const counter = {
  button: (listener) => `Count: ${count.get(listener)}`,
  onClick: () => count.set(count.get() + 1),
}
```

`count.get(listener)` does two things:

- returns the current value
- subscribes that reactive function to future changes

Subscriptions are released automatically when the node is removed.

<DomphyPreview :element="Counting"/>

<<< @/docs/demos/core/counting.ts

## Attributes

Reactive attributes are already fine-grained. When the state changes, Domphy updates only that attribute.

```ts
const open = toState(false)

const button = {
  button: "Toggle",
  ariaExpanded: (listener) => open.get(listener),
  disabled: (listener) => !open.get(listener),
}
```

This does not re-create the node. It only updates the affected DOM attributes.

Use reactive attributes for:

- `disabled`
- `hidden`
- `value`
- `aria-*`
- `data-*`
- any attribute whose value should track state directly

## CSS Props

Reactive CSS properties are also fine-grained. Domphy updates only the specific CSS declaration that changed.

```ts
const active = toState(false)

const box = {
  div: "Hello",
  style: {
    color: (listener) => active.get(listener) ? "red" : "gray",
    opacity: (listener) => active.get(listener) ? 1 : 0.5,
  },
}
```

This is different from re-rendering the whole node. The existing style rule stays mounted; only the changed CSS properties are updated.

Use reactive style props when:

- the element itself stays the same
- only visual state changes
- you want the smallest possible DOM/CSS update

## Children Update

Reactive children are more complex than attributes or CSS props. When the child function runs again, Domphy calls `children.update(...)` and reconciles the child list.

```ts
const items = toState([
  { id: 1, name: "A" },
  { id: 2, name: "B" },
])

const list = {
  ul: (listener) => items.get(listener).map(item => ({
    li: item.name,
    _key: item.id,
  })),
}
```

### Default Rerender

For light children such as text or simple unkeyed content, the default reactive child update is usually enough.

```ts
const count = toState(0)

const app = {
  p: (listener) => `Count: ${count.get(listener)}`,
}
```

This is the simplest form and should be the default choice for simple text children or lightweight child trees.

### Fine-Grain With `_key`

When children are dynamic lists, `_key` gives Domphy a reconciliation identity.

```ts
const list = {
  ul: (listener) => items.get(listener).map(item => ({
    li: item.name,
    _key: item.id,
  })),
}
```

`_key` is used only for child diffing. If the key matches, Domphy reuses the existing node instance and DOM node instead of creating a new one.

Use `_key` when:

- items can reorder
- items can insert in the middle
- items can be removed from the middle
- child instances carry important runtime behavior

Without `_key`, child diffing is more positional.

### Fine-Grain With Low-Level API

For the most control, update the child list imperatively through the `ElementList` API instead of relying on a reactive child function to rebuild the array.

```ts
const app = {
  div: [
    {
      button: "Add child",
      _onInit: (node) => {
        node.addEvent("click", () => {
          node.parent!.children.insert({ span: "New child" })
        })
      },
    },
  ],
}
```

Or inside a normal event handler:

```ts
{
  button: "Add child",
  onClick: (_, node) => {
    node.parent!.children.insert({ span: "New child" })
  },
}
```

This is also fine-grained:

- `insert()` creates only the new child
- `remove()` removes only that child
- `move()` reorders existing children
- `swap()` swaps existing children

Use the low-level API when updates are event-driven and local, and when you want explicit control over exactly which child changes.

## External State Systems

Domphy does not enforce a state architecture. Any system that can call a function works:

```ts
store.subscribe(() => listener())   // Zustand
atom.subscribe(() => listener())    // Nanostores
count$.subscribe(() => listener())  // RxJS
```

→ [State API](./api/state)

## Not To Do

- Do not create reactive update loops where one reactive read immediately feeds an event that writes the same source again without a clear boundary.

```ts
const text = toState("")

const field = {
  input: null,
  value: (listener) => text.get(listener),
  onChange: (event) => text.set((event.target as HTMLInputElement).value),
}
```

- Do not think of this as two-way binding; treat it as one-way data flow instead, where state drives the view and events explicitly write the next state.

```ts
const text = toState("")

const field = {
  input: null,
  value: (listener) => text.get(listener),
  onInput: (event) => {
    text.set((event.target as HTMLInputElement).value)
  },
}
```

- Do not move ordinary form synchronization into hooks; keep it in flat event handlers such as `onInput`, `onChange`, or `onClick` so the read path and write path stay visible.
