---
title: "Context & Shared State"
description: "Pass data deeply without prop drilling — module-level state, scoped context objects, and top-down data flow."
---

# Context & Shared State

Domphy has no `createContext` / `useContext` hook pair, but `ElementNode` does have a built-in tree-scoped context mechanism: `getContext(name)` / `setContext(name, value)`. It's not reactive (setting a value doesn't re-render descendants), so most apps reach for one of these patterns instead:

- **Tree-scoped context** — `node.setContext(name, value)` / `node.getContext(name)`, inherited by walking up to the nearest ancestor that set it. See below.
- **Module-level state** — a `State` defined at module scope is automatically shared across all components that import it.
- **Scoped context objects** — pass a plain object down through `_mount` props or function arguments.
- **Event bus / pub-sub** — coordinate loosely-coupled components.

## Built-in tree-scoped context

Every `ElementNode` has a `getContext(name)` / `setContext(name, value)` pair (see [ElementNode API](/docs/core/api/element-node)). `setContext` writes to the node's own `_context` object; `getContext` walks up `node.parent` until it finds an ancestor whose `_context` owns that key:

```ts
// Parent
node.setContext("theme", "dark")

// Any descendant
const theme = node.getContext("theme") // "dark"
```

`_context` can also be seeded declaratively on an element (`{ div: ..., _context: { theme: "dark" } }`). This is the closest built-in equivalent to React's `Context.Provider` + `useContext`, but reads are plain method calls, not reactive — a descendant only sees the value at the time it calls `getContext()`, so it won't automatically re-render when an ancestor calls `setContext()` again. For reactive sharing, use module-level state below.

## Module-level state (most common)

Define state at module scope; any element tree that imports it subscribes automatically:

```ts
// state/auth.ts
import { toState } from "@domphy/core"

export const currentUser = toState<{ name: string; role: string } | null>(null)
export const setUser = (user: typeof currentUser extends { get(): infer T } ? T : never) =>
  currentUser.set(user)
```

```ts
// Header.ts
import { currentUser } from "./state/auth.js"

export const Header = {
  header: [
    { span: "Domphy" },
    {
      span: (l) => currentUser.get(l)?.name ?? "Guest",
    },
  ],
}
```

```ts
// LoginButton.ts
import { setUser } from "./state/auth.js"

export const LoginButton = {
  button: "Log in",
  onClick: () => setUser({ name: "Alice", role: "admin" }),
}
```

Both `Header` and `LoginButton` share the same `currentUser` state — no prop threading needed. This is the idiomatic substitute for React Context.

## Scoped context (passed as argument)

When you want isolated instances (e.g. a reusable `FormContext` per form), pass a context object explicitly:

```ts
// form-context.ts
import { toState } from "@domphy/core"

export function createFormContext<T extends Record<string, string>>(defaults: T) {
  const values = toState<T>(defaults)
  const errors = toState<Partial<Record<keyof T, string>>>({})
  return { values, errors }
}
```

```ts
// SignupForm.ts
import { createFormContext } from "./form-context.js"

const ctx = createFormContext({ email: "", password: "" })

const EmailField = {
  input: null,
  type: "email",
  value: (l) => ctx.values.get(l).email,
  onInput: (e) => ctx.values.set({ ...ctx.values.get(), email: (e.target as HTMLInputElement).value }),
}

const PasswordField = {
  input: null,
  type: "password",
  value: (l) => ctx.values.get(l).password,
  onInput: (e) => ctx.values.set({ ...ctx.values.get(), password: (e.target as HTMLInputElement).value }),
}

export const SignupForm = {
  form: [EmailField, PasswordField],
}
```

Each `createFormContext()` call creates independent state — two `SignupForm` instances would have separate `ctx` objects.

## Providing context via `_mount` props

Pass context to a subtree by closing over it:

```ts
// ThemeContext.ts
export interface ThemeConfig {
  accentColor: string
  borderRadius: string
}

export function withTheme(config: ThemeConfig) {
  return (children: unknown[]) => ({
    div: children,
    style: {
      "--accent": config.accentColor,
      "--radius": config.borderRadius,
    },
  })
}
```

```ts
const App = withTheme({ accentColor: "#6366f1", borderRadius: "0.5rem" })([
  Header,
  MainContent,
  Footer,
])
```

## Event bus (pub/sub)

For decoupled communication between independent subtrees, use a `Notifier`:

```ts
// events.ts
import { Notifier } from "@domphy/core"

interface CartEvent {
  type: "add" | "remove"
  productId: string
}

export const cartEvents = new Notifier()
```

```ts
// AddToCartButton.ts
import { cartEvents } from "./events.js"

export const AddToCartButton = (productId: string) => ({
  button: "Add to cart",
  onClick: () => cartEvents.notify("cart", { type: "add", productId }),
})
```

```ts
// CartCount.ts
import { cartEvents } from "./events.js"
import { toState } from "@domphy/core"

const count = toState(0)

cartEvents.addListener("cart", (event: { type: "add" | "remove"; productId: string }) => {
  if (event.type === "add") count.set(count.get() + 1)
  if (event.type === "remove") count.set(Math.max(0, count.get() - 1))
})

export const CartCount = {
  span: (l) => String(count.get(l)),
}
```

## Derived state (computed)

Use `computed` to derive values from multiple sources — automatically re-evaluates when dependencies change:

```ts
import { toState, computed } from "@domphy/core"

const items = toState<{ price: number; qty: number }[]>([])
const discount = toState(0)

const subtotal = computed(() => items.get().reduce((s, i) => s + i.price * i.qty, 0))
const total = computed(() => subtotal.get() * (1 - discount.get() / 100))

export const OrderSummary = {
  div: [
    { span: (l) => `Subtotal: $${subtotal.get(l).toFixed(2)}` },
    { span: (l) => `Total: $${total.get(l).toFixed(2)}` },
  ],
}
```

`computed` is lazy: it only re-runs when a subscribed listener reads it AND a dependency has changed.

## Comparing to React patterns

| React | Domphy |
|-------|--------|
| `createContext` + `useContext` | Module-level `toState` export (reactive), or `node.getContext`/`setContext` (non-reactive, tree-scoped) |
| `Context.Provider` with value | Close over a local `createXxxContext()` object, or `node.setContext(name, value)` |
| `useReducer` + `Context` | `toState` + updater functions in the same module |
| `Redux` / `Zustand` store | Module-level `RecordState` or `toState` |
| `useId()` | `crypto.randomUUID()` or a counter in module scope |
| `useRef(value)` | Mutable variable in module scope or closure |
