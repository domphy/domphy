# Utilities

Top-level helper functions exported by `@domphy/core`.

```ts
import { toState, toListState, merge, hashString } from "@domphy/core"
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

## `toListState(value)`

Creates a `ListState` from a plain array. If the input is already a `ListState`, returns it as-is.

```ts
const items = toListState(["a", "b", "c"])   // ListState<string>
const same  = toListState(items)              // same ListState, no wrapping
```

| Parameter | Type | Description |
|---|---|---|
| `value` | `T[] \| ListState<T>` | Raw array or existing `ListState` |

Returns `ListState<T>`.

Common use case: normalize patch props so callers can pass either a plain array or a reactive list state.

```ts
const list = toListState(props.items ?? [])
```

→ [ListState API](./list-state)

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
