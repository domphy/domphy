# State

Reactive value container. When the value changes, all listeners are notified.

## `ReadableState<T>`

A read-only view of a `State<T>`. Exposes only `get(listener?)` — no `set`, `reset`, or `addListener`. Use it when you want to pass a state to a consumer that should read but not mutate it.

```ts
export type ReadableState<T> = {
  readonly _isState: true;
  get(listener?: ValueListener<T>): T;
};
```

The `_isState: true` discriminant lets runtime code and type guards distinguish a `ReadableState` from a plain value.

```ts
import type { ReadableState } from "@domphy/core"

function display(count: ReadableState<number>) {
  return { p: (l) => `Count: ${count.get(l)}` }
}
```

`ReadableState<T>` is exported as a named type from `@domphy/core`. `State<T>` satisfies `ReadableState<T>` — any `State` can be passed where a `ReadableState` is expected. `toState()` also accepts `ReadableState<T>` as input (returns it as-is).

```ts
import { toState } from "@domphy/core"

const count = toState(0)

count.get()        // 0
count.set(1)       // notify all listeners
count.get()        // 1
count.reset()      // back to 0
```

Create a `State` with `toState()` from `@domphy/core`. The `toState()` function is documented in the Utilities page.

## Methods

### `get(listener?)`

Returns the current value. If a listener is provided, subscribes it to future changes.

```ts
const value = count.get()

// With listener — auto-subscribe
const value = count.get(listener)
```

### `set(newValue)`

Updates the value and notifies all listeners.

```ts
count.set(5)
```

### `reset()`

Resets the value to `initialValue`.

```ts
const filter = toState("all")
filter.set("active")
filter.reset()
filter.get()  // "all"
```

### `addListener(listener)`

Subscribes a listener to value changes. Returns a release function.

```ts
const release = count.addListener((value) => {
  console.log(value)
})

// Unsubscribe
release()
```

## Reactive children

Pass a function as children to make an element reactive:

```ts
const count = toState(0)

const node: DomphyElement = {
  p: (listener) => `Count: ${count.get(listener)}`
//                                      ↑ subscribes automatically
}
```

When `count.set()` is called, the element re-renders automatically.

## `initialValue`

The value passed to the constructor. Used by `reset()`.

```ts
const count = toState(0)
count.initialValue  // 0
```

## `ValueOrState<T>`

A union type accepted by patch props and element attributes that can be either a plain value, a reactive `State<T>`, or a read-only `ReadableState<T>`.

```ts
export type ValueOrState<T> = T | State<T> | ReadableState<T>;
```

Use it in function signatures when a prop should accept both static values and reactive states:

```ts
import type { ValueOrState } from "@domphy/core"

function myPatch(open: ValueOrState<boolean>): PartialElement {
  return {
    ariaExpanded: typeof open === "object" && open._isState
      ? (l) => (open as ReadableState<boolean>).get(l)
      : open,
  }
}
```

In practice most patch props accept `ValueOrState<T>` so callers can pass `true` / `false` or a `toState(false)` interchangeably.
