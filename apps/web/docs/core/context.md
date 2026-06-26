---
title: "Context & Shared State"
description: "Pass data deeply without prop drilling — module-level state, scoped context objects, and top-down data flow."
---

# Context & Shared State

Domphy has no built-in "context" API (no `createContext` / `useContext`). Instead:

- **Module-level state** — a `State` defined at module scope is automatically shared across all components that import it.
- **Scoped context objects** — pass a plain object down through `_mount` props or function arguments.
- **Event bus / pub-sub** — coordinate loosely-coupled components.

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
  onInput: (e) => ctx.values.set((v) => ({ ...v, email: (e.target as HTMLInputElement).value })),
}

const PasswordField = {
  input: null,
  type: "password",
  value: (l) => ctx.values.get(l).password,
  onInput: (e) => ctx.values.set((v) => ({ ...v, password: (e.target as HTMLInputElement).value })),
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

export const cartEvents = new Notifier<CartEvent>()
```

```ts
// AddToCartButton.ts
import { cartEvents } from "./events.js"

export const AddToCartButton = (productId: string) => ({
  button: "Add to cart",
  onClick: () => cartEvents.notify({ type: "add", productId }),
})
```

```ts
// CartCount.ts
import { cartEvents } from "./events.js"
import { toState } from "@domphy/core"

const count = toState(0)

cartEvents.subscribe((event) => {
  if (event.type === "add") count.set((n) => n + 1)
  if (event.type === "remove") count.set((n) => Math.max(0, n - 1))
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

const subtotal = computed((l) => items.get(l).reduce((s, i) => s + i.price * i.qty, 0))
const total = computed((l) => subtotal.get(l) * (1 - discount.get(l) / 100))

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
| `createContext` + `useContext` | Module-level `toState` export |
| `Context.Provider` with value | Close over a local `createXxxContext()` object |
| `useReducer` + `Context` | `toState` + updater functions in the same module |
| `Redux` / `Zustand` store | Module-level `RecordState` or `toState` |
| `useId()` | `crypto.randomUUID()` or a counter in module scope |
| `useRef(value)` | Mutable variable in module scope or closure |
