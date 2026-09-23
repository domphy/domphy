# Utilities

Top-level helper functions exported by `@domphy/core`.

```ts
import { toState, merge, hashString, peek } from "@domphy/core"
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

## `mergePartial(element)`

Collapses an element's `$` patch array into the element itself, the way `ElementNode` does before rendering: every patch is expanded first (a patch may carry its own `$`), the results are composed left to right, and the element's own keys are applied last so a **native declaration always beats a patch default**.

```ts
mergePartial({
  button: "Save",
  id: "native",
  $: [{ id: "patch", title: "from patch" }],
})
// { button: "Save", id: "native", title: "from patch" }
```

| Parameter | Type | Description |
|---|---|---|
| `element` | `PartialElement \| DomphyElement` | Element whose `$` to collapse |

Returns a **new** object when the element has a `$`, and the element itself when it has none. The input is never modified, and the result carries no `$`.

You rarely need this when rendering — `ElementNode` calls it for you. It is public for tooling that has to see a fully-composed element *before* one is constructed (`@domphy/doctor` analysing a tree), so that composition order has exactly one definition.

---

## `behavior(key, attach, props)`

Declares a per-node behavior (Svelte-action-like) inside a patch factory. `attach(node, props)` runs once for the real DOM node the returned partial lands on, no matter how many times the factory itself is re-invoked by a reactive parent — every later call routes its `props` into the SAME instance via `update()` instead of creating a new, disconnected one. `destroy()` fires exactly once when the node is removed.

```ts
import { behavior } from "@domphy/core"

function draggable(props: { onMove(dx: number, dy: number): void }) {
  return behavior("draggable", (node, props) => {
    const onPointerMove = (e: PointerEvent) => props.onMove(e.movementX, e.movementY)
    node.domElement!.addEventListener("pointermove", onPointerMove)
    return {
      update: (next) => { props = next },
      destroy: () => node.domElement!.removeEventListener("pointermove", onPointerMove),
    }
  }, props)
}
```

| Parameter | Type | Description |
|---|---|---|
| `key` | `string` | Identifies this concern on the element. Two DIFFERENT patches sharing one element (e.g. a tooltip and a popover on the same button) should use distinct keys so their instances stay independent. |
| `attach` | `(node: ElementNode, props: P) => { update?(props: P): void; destroy?(): void } \| void` | Runs once for the real node. Returns the instance's `update`/`destroy` callbacks. |
| `props` | `P` | Passed to `attach` on first attach, and to `update` on every later re-declaration of the same `key`. |

Returns a `PartialElement` fragment (`{ _behaviors: { [key]: { attach, props } } }`) — compose it like any other patch field via object spread, `merge()`, or `$`.

Read a node's own attached instance with `node.getBehavior(key)` — it walks up through ancestors (like `getContext`/`getMetadata`), since the event that needs it often fires on a descendant of the element that declared the behavior (e.g. an inner `<input>`'s `onFocus` needing a behavior declared on its outer wrapper).

Use `behavior()` instead of a raw `_onMount` whenever a patch needs imperative state that must survive a reactive parent re-rendering the node it's attached to — document/window listeners, `ResizeObserver`/`IntersectionObserver`, non-Domphy library instances. See [Reused-node lifecycle](https://github.com/domphy/domphy/blob/main/AGENTS.md#reused-node-lifecycle--the-gotchas-behind-most-real-bugs) for why this matters, and [Common Patterns → Per-node behavior](../patterns#per-node-behavior-imperative-state-that-survives-re-renders) for a fuller example.

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

Do not use `hashString()` to generate ids for Domphy nodes. `ElementNode` already exposes `node.nodeId`, a per-instance id assigned in document order by the node's root — unique across the page (two mounts of one component get different ids) and identical between SSR and hydration.

A content-hashed `@keyframes` name like the one above is shared rather than re-inserted: identical keyframes text ends up as one rule in the stylesheet no matter how many elements animate with it.

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

Flushes all currently queued notifiers synchronously, **including notifiers scheduled while draining** (a listener that writes another state re-schedules its own notifier). Unlike `flushSync`, this does **not** drain the effect/computed reaction queue.

```ts
import { flushPendingNotifiers } from "@domphy/core"

a.set(1)
flushPendingNotifiers()
// notifiers for `a` have fired, including any notifiers those callbacks queued
```

Prefer `flushSync()` when you need a fully settled reactive graph (notifiers **and** the reaction queue). `flushPendingNotifiers()` only drains the notifier set — it is not a one-pass flush.

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

`fn` may **return a cleanup function**, which runs right before each re-run and once on dispose — the same contract as Svelte 5's `$effect` and Preact signals' `effect` (Solid's `onCleanup`). Use it for per-run resources so they do not accumulate one per dependency change:

```ts
const id = toState(1)

const stop = effect(() => {
  const socket = new WebSocket(`wss://example.com/${id.get()}`)
  return () => socket.close()   // closed before the next run, and on stop()
})
```

Any `effect`, `computed` or `effectScope` created **inside** a run is owned by that run and disposed when it is superseded (Solid owner semantics), so a nested effect does not accumulate one live instance per outer re-run.

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

## `peek(read)`

Reads a reactive function `(listener) => T` **outside** a render / reactive context — for example checking a `disabled` binding inside an `onClick` handler. The read runs with no listener and untracked: the value resolves once and nothing is subscribed, so it never becomes a dependency of an enclosing `effect` / `computed` either. This is the supported form of the `read(undefined as unknown as Listener)` cast.

```ts
import { peek, toState } from "@domphy/core"

const disabled = toState(true)
const read = (listener) => disabled.get(listener)

peek(read)           // true — no subscription is created
disabled.set(false)
peek(read)           // false

// Inside an event handler (no listener available):
onClick: () => {
  if (peek(props.disabled)) return
  submit()
}
```

| Parameter | Type | Description |
|---|---|---|
| `read` | `(listener: Listener) => T` | A reactive reader — typically a `ValueOrState` binding or `(l) => state.get(l)` |

Returns `T`. Use `peek` only when you need a one-shot value outside render. Inside an element child or `style` function, read with the listener you were given so the node stays reactive.

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

`source` can be a `State` or a getter function `() => T`. `callback` receives `(newValue, oldValue)`. Options: `{ immediate?: boolean }` — if `true`, runs callback immediately with the current value.

Only the **source** is tracked. Reads inside `callback` are untracked, so an unrelated state read there never becomes a watcher dependency (Vue 3 `watch` semantics).

To watch multiple sources at once, compose them into a single getter — `watch` re-runs whenever any state read inside it changes:

```ts
const stop = watch(
  () => [a.get(), b.get()] as const,
  ([newA, newB], prev) => {
    console.log("a:", newA, "b:", newB)
  },
)
```

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
