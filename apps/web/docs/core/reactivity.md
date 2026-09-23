<script setup lang="ts">

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

## Derived Reactivity

The `(listener) => state.get(listener)` form is the foundation: an explicit listener subscribes a reactive part to a state. On top of it, Domphy ships derived primitives — `computed`, `effect`, `effectScope`, `batch`, `untrack`, `flushSync`, `watch`, and `nextTick` — for computations that depend on **other** reactive values. They build on the same `Notifier` machinery, so they participate in the same flush and cycle detection as a plain `state.get`.

These primitives **auto-track**: a reactive read with no explicit listener inside a `computed` or `effect` subscribes automatically. The explicit `(l) => state.get(l)` path used in elements is unchanged — both work, and they compose.

Signatures and examples: [Utilities](./api/utilities).

Unique to this page:

- `computed` notifies downstream only when the new value differs by `Object.is` from the cached one (the same rule `State.set()` uses).
- `effect(fn)` may **return a cleanup function**: it runs right before the next re-run and once on dispose — the Svelte 5 `$effect` / Preact-signals contract, equivalent to Solid's `onCleanup`. The `dispose()` **returned by `effect()`** tears the whole effect down. Each run re-collects dependencies, so reads no longer reached are dropped, and any `effect`/`computed`/`effectScope` created during a run is disposed with it.
- `watch(source, cb)` tracks only the **source**. Reads inside `cb` are untracked, so they never become watcher dependencies (Vue 3 semantics).
- **Runaway loops are capped.** An effect that writes a dependency it also reads — directly, or in a cycle with a second effect — would re-run forever. The scheduler counts re-runs of the same reaction within one flush and, past **100** (Vue 3's `RECURSION_LIMIT`), skips it for the rest of that flush and logs `Maximum recursive updates exceeded`. The counter resets once the system settles, so a test/benchmark loop of `set()` + `flushSync()` never trips it.

## State utilities

### isState

`isState(value)` is a type guard that returns `true` when `value` is a `State<T>` or any `ReadableState<T>` (including `Computed<T>`). Use it when writing utilities that accept either a raw value or a reactive source.

```ts
import { isState, toState } from "@domphy/core"

const count = toState(0)

isState(count)   // true
isState(42)      // false
isState("hello") // false
```

Typed usage:

```ts
function getValue<T>(src: T | ReadableState<T>): T {
  return isState(src) ? src.get() : src
}
```

### readonly

`readonly(source)` wraps a `State<T>` or `ReadableState<T>` in a read-only view. The returned object exposes only `.get()` — callers cannot call `.set()`. Use it to expose state from a module without granting external write access.

```ts
import { toState, readonly } from "@domphy/core"

const _count = toState(0)

// Expose read-only; consumers can subscribe but not mutate
export const count = readonly(_count)
export const increment = () => _count.set(_count.get() + 1)
```

The returned `ReadableState<T>` is compatible everywhere a state is accepted as a reactive source — including `(l) => count.get(l)` bindings in elements, `computed(fn)`, `watch(source, ...)`, etc.

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
