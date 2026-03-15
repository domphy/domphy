# ListState

Reactive list container. Holds an ordered collection of `State<T>` entries. When the list structure changes (insert, remove, move, swap, clear, reset), all listeners are notified.

```ts
import { toListState } from "@domphy/core"

const items = toListState(["a", "b", "c"])

items.states()   // [State<string>, State<string>, State<string>]
items.insert("d")
items.remove(items.states()[0])
```

Create a `ListState` with `toListState()` from `@domphy/core`. The `toListState()` function is documented in the [Utilities](./utilities) page.

## `ListEntry<T>`

Each item in the list is stored as a `ListEntry`:

```ts
type ListEntry<T> = { key: number, state: State<T> }
```

- `key` — stable numeric identity assigned at insert time. Never reused within the same `ListState` instance.
- `state` — reactive `State<T>` holding the item value.

Use `key` for child reconciliation with `_key`, and `state` to read or write the item value reactively.

## Methods

### `entries(listener?)`

Returns all entries as `ListEntry<T>[]`. If a listener is provided, subscribes it to structural changes.

```ts
const entries = items.entries()         // snapshot
const entries = items.entries(listener) // reactive
```

### `states(listener?)`

Returns all `State<T>` instances. Shorthand for `entries().map(e => e.state)`.

```ts
const states = items.states(listener)
```

### `keys(listener?)`

Returns all numeric keys. Useful when you need only the identity, not the value.

```ts
const keys = items.keys(listener)
```

### `insert(item, silent?)`

Appends a new item to the end of the list. Returns the created `ListEntry<T>`.

```ts
const entry = items.insert("new item")
entry.key    // stable id
entry.state  // State<string>
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `item` | `T` | — | Value to insert |
| `silent` | `boolean` | `false` | Skip notifying listeners |

### `remove(state, silent?)`

Removes the entry associated with the given `State<T>`.

```ts
const [first] = items.states()
items.remove(first)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `state` | `State<T>` | — | State reference to remove |
| `silent` | `boolean` | `false` | Skip notifying listeners |

### `move(from, to, silent?)`

Moves an entry from index `from` to index `to`.

```ts
items.move(0, 2)  // move first item to index 2
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `from` | `number` | — | Source index |
| `to` | `number` | — | Destination index |
| `silent` | `boolean` | `false` | Skip notifying listeners |

### `swap(aIndex, bIndex, silent?)`

Swaps two entries by index.

```ts
items.swap(0, 1)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `aIndex` | `number` | — | First index |
| `bIndex` | `number` | — | Second index |
| `silent` | `boolean` | `false` | Skip notifying listeners |

### `clear(silent?)`

Removes all entries.

```ts
items.clear()
```

### `reset(silent?)`

Restores the original insertion order by sorting entries by their `key`.

```ts
items.reset()
```

### `onChange(fn)`

Subscribes to structural changes. Returns a `release` function.

```ts
const release = items.onChange(() => {
  console.log("list changed")
})

// Unsubscribe
release()
```

## Usage with `_key`

Use `entries()` with `_key` so Domphy reuses DOM nodes when the list reorders:

```ts
const items = toListState(["a", "b", "c"])

const list = {
  ul: (listener) => items.entries(listener).map(({ key, state }) => ({
    li: (l) => state.get(l),
    _key: key,
  })),
}
```

- `key` is stable across reorders — Domphy matches it to existing nodes.
- `state.get(l)` keeps each item's text reactive independently.

## Imperative Updates

List mutations are event-driven and do not require rebuilding the whole child array:

```ts
const items = toListState<string>([])

const app = {
  div: [
    {
      button: "Add",
      onClick: () => items.insert("new item"),
    },
    {
      ul: (listener) => items.entries(listener).map(({ key, state }) => ({
        li: [
          { span: (l) => state.get(l) },
          {
            button: "Remove",
            onClick: () => items.remove(state),
          },
        ],
        _key: key,
      })),
    },
  ],
}
```

Each `insert()` or `remove()` creates or destroys only the affected child.
