# Utilities

Top-level helper functions exported by `@domphy/core`.

```ts
import { toState, merge, hashString } from "@domphy/core"
```

Use `Utilities` here rather than `Functions`: these are reusable helper APIs, not the main object model like `ElementNode`, `ElementList`, or `State`.

## `toState(value)`

Creates a `State` from a raw value. If the input is already a `State`, returns it as-is.

```ts
const a = toState(0)   // State<number>
const b = toState(a)   // same State<number>, no wrapping
```

| Parameter | Type | Description |
|---|---|---|
| `value` | `T \| State<T>` | Raw value or existing `State` |

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

## `r(fn)`

Identity helper for reactive functions. Returns `fn` unchanged. Its sole purpose is to give TypeScript a typed entry point for inline reactive expressions so editors can infer the listener type without an extra cast.

```ts
import { r } from "@domphy/core"

const box = {
  div: "Hello",
  style: {
    color: r((listener) => active.get(listener) ? "red" : "gray"),
  },
}
```

`r` does not wrap or modify the function at runtime — it is a zero-cost identity.
