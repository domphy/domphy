# Utilities

Top-level helper functions exported by `@domphy/core`.

```ts
import { toState, merge, hashString } from "@domphy/core"
```

Use `Utilities` here rather than `Functions`: these are reusable helper APIs, not the main object model like `ElementNode`, `ElementList`, or `State`.

## `toState(value, name?)`

Creates a `State` from a raw value. If the input is already a `State` or `ReadableState`, returns it as-is.

```ts
const a = toState(0)         // State<number>
const b = toState(a)         // same State<number>, no wrapping
const c = toState(0, "count") // State<number> with debug name "count"
```

| Parameter | Type | Description |
|---|---|---|
| `value` | `T \| State<T> \| ReadableState<T>` | Raw value, existing `State`, or `ReadableState` |
| `name` | `string` (optional) | Debug name for the state, used in devtools and error messages |

Returns `State<T>`.

Common use case: normalize patch props so callers can pass either a plain value or a reactive state.

```ts
const openState = toState(props.open ?? false)
```

---

## `merge(source, target)`

Deep-merges `target` into `source` using Domphy's composition rules.

```ts
const base = { class: "card", style: { padding: "1rem" } }
merge(base, { class: "active", style: { color: "red" } })

// base is now:
// { class: "card active", style: { padding: "1rem", color: "red" } }
```

| Parameter | Type | Description |
|---|---|---|
| `source` | `Record<string, any>` | Object to mutate |
| `target` | `Record<string, any>` | Values to merge into `source` |

Returns the same `source` object after merge.

Key merge behaviors:

- Plain objects are merged deeply.
- `class`, `transform`, `rel` and similar fields are space-joined.
- `animation`, `transition`, `boxShadow` and similar fields are comma-joined.
- Event handlers like `onClick` are chained.
- Hooks like `_onMount` are chained.
- Most other keys are overwritten by `target`.

Use `merge()` when composing patches or mutating a raw element in `_onSchedule`.

---

## `hashString(str?)`

Generates a deterministic string hash. The result always starts with a lowercase letter, so it is safe to use as a CSS identifier.

```ts
hashString("hello")  // e.g. "b4a2f1c3"
hashString("hello")  // same input, same output
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `str` | `string` | `""` | Input string to hash |

Returns a `string`.

Primary use case: generate a stable animation name from keyframes.

```ts
const keyframes = { to: { transform: "rotate(360deg)" } }
const animationName = hashString(JSON.stringify(keyframes))

const style = {
  animation: `${animationName} 0.7s linear infinite`,
  [`@keyframes ${animationName}`]: keyframes,
}
```

Do not use `hashString()` to generate ids for Domphy nodes. `ElementNode` already exposes `node.nodeId`, which is the runtime-scoped unique id used by the framework.

Notes:

- Deterministic: identical input always produces identical output.
- CSS-safe: output always starts with a letter.
- Not cryptographic: use it for IDs and CSS names, not security.

---

## `configure(options)`

Set global runtime options. Call once before mounting your app.

```ts
import { configure } from "@domphy/core"

configure({ cspNonce: "abc123" })
```

| Option | Type | Description |
|---|---|---|
| `cspNonce` | `string` | Nonce stamped on every `<style>` element injected by Domphy. Required when your Content-Security-Policy uses `style-src 'nonce-...'` instead of `'unsafe-inline'`. |

---

## `flushSync()`

Synchronously drains all pending state-change notifications and the deduplicated effect/computed reaction queue. Useful in tests and imperative code that must observe the DOM immediately after `.set()` instead of waiting for the next microtask.

```ts
import { toState, flushSync } from "@domphy/core"

const count = toState(0)
count.set(1)
flushSync()
// count.get() === 1 and all downstream effects/computeds are settled
```

If a diverging reactive loop prevents settling, `flushSync` breaks after 10 000 iterations and logs a `console.error`. Inside `batch()`, batched writes still flush when the batch ends — `flushSync` does not flush them early.

---

## `runBatched(fn)`

Runs `fn` inside a batch, coalescing all state writes into a single downstream flush. Equivalent to calling `batch(fn)` directly. Returns the value returned by `fn`.

```ts
import { runBatched } from "@domphy/core"

runBatched(() => {
  a.set(10)
  b.set(20)
})
// downstream effects/computeds re-run once
```

Use `runBatched` when passing a batch-wrapped callback to external code that expects a plain function signature.

---

## `hasPendingNotifiers()`

Returns `true` if there are reactive notifications queued but not yet flushed.

```ts
import { hasPendingNotifiers } from "@domphy/core"

a.set(1)
hasPendingNotifiers() // true — flush has not run yet
```

Useful in tests or scheduling code to check whether any state change is still pending before reading derived values.

---

## `flushPendingNotifiers()`

Flushes all currently queued notifiers synchronously, without draining the full effect/computed reaction queue (unlike `flushSync`). Each pending notifier runs its downstream callbacks once.

```ts
import { flushPendingNotifiers } from "@domphy/core"

a.set(1)
flushPendingNotifiers()
// notifiers for `a` have fired; any newly queued notifiers are not flushed
```

Prefer `flushSync()` when you need a fully settled reactive graph. Use `flushPendingNotifiers()` when you only need one notification pass (e.g. inside a scheduler that will call it in a loop).

---

## `computed(fn)`

Creates a derived reactive value. `fn` is called without arguments — read states with `.get()` (no listener needed; dependencies are auto-tracked).

```ts
import { toState, computed } from "@domphy/core"

const count = toState(0)
const doubled = computed(() => count.get() * 2)
// doubled.get() === 0 initially; updates when count changes
```

Returns `Computed<T>`. Read the value with `.get(listener?)` — the optional listener makes the call reactive in UI elements.

---

## `effect(fn)`

Runs `fn` immediately and re-runs it whenever its tracked dependencies change.

```ts
import { toState, effect } from "@domphy/core"

const count = toState(0)
const stop = effect(() => {
  console.log("count:", count.get())
})
// Logs on every count change. Call stop() to clean up.
```

Returns a cleanup function `() => void`. Always call it in `_onBeforeRemove` or `_onRemove` to avoid memory leaks.

---

## `batch(fn)`

Runs `fn` inside a batch, coalescing all state writes into a single downstream notification. Same as `runBatched(fn)`.

```ts
import { toState, batch } from "@domphy/core"

const a = toState(0)
const b = toState(0)

batch(() => {
  a.set(1)
  b.set(2)
})
// effects/computeds depending on a or b re-run once
```

Returns the value returned by `fn`.

---

## `untrack(fn)`

Runs `fn` without tracking any reactive reads. Dependencies accessed inside `fn` are not registered.

```ts
import { toState, effect, untrack } from "@domphy/core"

const source = toState(0)
const other = toState(0)

effect(() => {
  const s = source.get()           // tracked — effect re-runs when source changes
  const o = untrack(() => other.get()) // NOT tracked — effect ignores other changes
  console.log(s, o)
})
```

---

## `watch(source, callback, options?)`

Explicit watcher: runs `callback` whenever `source` changes.

```ts
import { toState, watch } from "@domphy/core"

const count = toState(0)
const stop = watch(count, (newVal, oldVal) => {
  console.log("changed from", oldVal, "to", newVal)
})
// Call stop() to unsubscribe
```

`source` can be a `State`, a getter function `() => T`, or an array of either. `callback` receives `(newValue, oldValue)`. Options: `{ immediate?: boolean }` — if `true`, runs callback immediately with the current value.

---

## `effectScope()`

Creates a scope that collects all `effect()` calls made inside it. Calling `scope.stop()` cleans up all of them at once.

```ts
import { effectScope, effect, toState } from "@domphy/core"

const scope = effectScope()
const count = toState(0)

scope.run(() => {
  effect(() => console.log("a:", count.get()))
  effect(() => console.log("b:", count.get()))
})

scope.stop() // both effects cleaned up
```

Returns `EffectScopeHandle` with `.run(fn)` and `.stop()` methods.

---

## `nextTick(fn?)`

Defers `fn` to the next reactive flush microtask — after all pending state changes and effects settle.

```ts
import { toState, nextTick } from "@domphy/core"

const count = toState(0)
count.set(1)

await nextTick()
// all effects/computeds dependent on count have now re-run

// Or pass a callback:
nextTick(() => {
  console.log("settled")
})
```

Returns `Promise<void>`. Useful in tests and for reading DOM state after a reactive update.
