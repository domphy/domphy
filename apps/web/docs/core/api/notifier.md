# Notifier

Subscription utility used internally by `State` and `AttributeList`.

## Methods

### `addListener(event, listener)`

Registers a listener for an event. Returns a `release` function to unsubscribe.

```ts
const release = notifier.addListener("change", (value) => {
  console.log(value)
})

// Unsubscribe
release()
```

If the listener has an `onSubscribe` callback, it is called immediately with the `release` function — useful for auto-cleanup:

```ts
const listener = (value: string) => console.log(value)

listener.onSubscribe = (release) => {
  node.addHook("BeforeRemove", release)  // auto-cleanup on node remove
}

notifier.addListener("change", listener)
```

### `removeListener(event, listener)`

Removes a specific listener from an event.

```ts
notifier.removeListener("change", listener)
```

### `notify(event, ...args)`

Calls all listeners registered for an event.

```ts
notifier.notify("change", newValue)
```

### `listenerCount(event)`

Returns the number of listeners subscribed to an event. Used internally by `computed` to stay lazy — an unobserved computed only marks itself dirty on a dependency change and defers recomputation until the next read.

```ts
const count = notifier.listenerCount("change") // e.g. 3
```

## `Handler` type

```ts
type Handler = ((...args: any[]) => any) & {
  onSubscribe?: (release: () => void) => void
}
```

`onSubscribe` is called once when the listener is registered. Use it to tie the listener's lifetime to another object.

