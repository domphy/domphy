# State

Reactive value container. When the value changes, all listeners are notified.

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

### `onChange(listener)`

Subscribes a listener to value changes. Returns a `release` function.

```ts
const release = count.onChange((value) => {
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
