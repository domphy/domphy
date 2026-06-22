# Coming from React

A practical translation guide: your React mental model mapped to Domphy equivalents.

## The core shift

In React, the unit of composition is a **component** — a function that returns JSX. Props flow down, state lives inside the component, effects handle side-effects.

In Domphy, the unit is a **plain object** with patches applied via `$`. There are no components. State lives in `toState` values; patches apply behavior and style directly to native elements. The rendering model is simpler: a static description of the DOM + reactive values that update specific parts.

## State

```tsx
// React
const [count, setCount] = useState(0)
<p>{count}</p>
<button onClick={() => setCount(count + 1)}>Add</button>
```

```ts
// Domphy
import { toState } from "@domphy/core"

const count = toState(0)
const App = {
  div: [
    { p: (l) => `Count: ${count.get(l)}` },
    { button: "Add", onClick: () => count.set(count.get() + 1) },
  ],
}
```

Key differences:
- `toState(initial)` creates a mutable state value — no hook, no component scope
- Read reactively: `(l) => count.get(l)` — the `l` (listener) tracks which states a reactive function depends on
- Write anywhere: `count.set(newValue)` — no setter function from a hook tuple

## Computed values

```tsx
// React
const double = useMemo(() => count * 2, [count])
```

```ts
// Domphy
import { computed } from "@domphy/core"

const double = computed(() => count.get() * 2)
// read: (l) => double.get(l)
```

`computed` is lazy and cached — only recomputes when dependencies change.

`computed` returns a `Computed<T>`, which satisfies `ReadableState<T>` — the read-only state interface from `@domphy/core`. Use `ReadableState<T>` in function signatures when the caller should only read, not write:

```ts
import type { ReadableState } from "@domphy/core"

function display(count: ReadableState<number>) {
  return { p: (l) => count.get(l) }
}
```

## Effects

```tsx
// React
useEffect(() => {
  document.title = `Count: ${count}`
  return () => { /* cleanup */ }
}, [count])
```

```ts
// Domphy
import { effect } from "@domphy/core"

const stop = effect(() => {
  document.title = `Count: ${count.get()}`
  // Note: unlike React useEffect, returning a function has no effect.
  // To clean up, call the returned stop() function directly.
})
// call stop() to dispose
```

Effects auto-track dependencies like `computed` — no dependency array.

## Object state / records

```tsx
// React
const [user, setUser] = useState({ name: "Alice", age: 30 })
setUser(prev => ({ ...prev, age: 31 }))
```

```ts
// Domphy
import { RecordState } from "@domphy/core"

const user = new RecordState({ name: "Alice", age: 30 })
user.set("age", 31)
// per-key reactivity: listeners on "age" don't re-run on "name" change
```

`RecordState` gives you per-key reactivity — a listener watching `user.get("age", l)` only re-runs when `age` changes, not the whole object.

## "Components" → patches + plain objects

React components are the unit of reuse. In Domphy, reuse happens two ways:

**Function that returns an element** (like a component):
```ts
// React
function Badge({ label, color }) {
  return <span className={`badge badge-${color}`}>{label}</span>
}

// Domphy
function Badge(label: string, color: string) {
  return { span: label, $: [badge({ color })] }
}
```

**Patch function** (for reusable behavior/style):
```ts
// React
function PrimaryButton({ label, onClick }) {
  return <button className="btn-primary" onClick={onClick}>{label}</button>
}

// Domphy — patch instead of wrapper component
function primaryButton(): PartialElement {
  return {
    style: {
      backgroundColor: (l) => themeColor(l, "shift-6", "primary"),
      color: (l) => themeColor(l, "shift-15", "primary"),
      // ...
    }
  }
}
// Use: { button: label, onClick, $: [primaryButton()] }
```

The difference: a patch doesn't render anything — it *extends* the element you already wrote.

## Props

React components receive props as a function argument. Domphy elements are plain objects, so "props" are just object keys alongside the tag:

```tsx
// React
<Button label="Save" color="primary" disabled={isLoading} />
```

```ts
// Domphy
{ button: "Save", $: [button({ color: "primary" })], disabled: isLoading }
```

Attributes like `disabled`, `type`, `href`, `value` are just keys on the element object. Patch props (color, size, variant) go inside the patch function call `button({ ... })`.

## Event handlers

```tsx
// React
<input value={name} onChange={(e) => setName(e.target.value)} />
```

```ts
// Domphy
{ input: null, type: "text", value: (l) => name.get(l), onInput: (e) => name.set((e.target as HTMLInputElement).value) }
```

- Event names: `onClick`, `onInput`, `onChange`, `onFocus`, `onBlur`, etc. — same as React's synthetic events but native (no SyntheticEvent wrapper)
- Controlled input: `value: (l) => state.get(l)` + `onInput` write is loop-safe (setting `.value` programmatically doesn't retrigger `onInput`)

## Context

```tsx
// React
const ThemeContext = createContext("light")
// provide: <ThemeContext.Provider value="dark">
// consume: const theme = useContext(ThemeContext)
```

```ts
// Domphy — context lives on the element tree via _context
const container = {
  div: [...children],
  _context: {
    config: { value: toState("dark") }
  }
}

// In a child patch's _onInsert:
const context = node.getContext("config")
const value = context.value.get(listener)
```

Context is defined as `_context` on a container element and accessed via `node.getContext("name")` in a patch's `_onInsert` lifecycle hook.

## Lifecycle

```tsx
// React
useEffect(() => {
  // mount
  const sub = api.subscribe(handler)
  return () => sub.unsubscribe() // unmount
}, [])
```

```ts
// Domphy — lifecycle hooks in a patch or directly on the element
const patch: PartialElement = {
  _onMount: (node) => {
    const sub = api.subscribe(handler)
    node.addHook("BeforeRemove", (n, done) => {
      sub.unsubscribe()
      done()
    })
  },
}
```

Lifecycle hooks available:
- `_onSchedule(node, raw)` — before parsing; mutate the raw element here (e.g. apply context-aware patches)
- `_onInit(node)` — after parsing, before insertion; node properties are set, no siblings yet
- `_onInsert(node)` — added to the parent child list; siblings and position available
- `_onMount(node)` — DOM element created and connected; `node.domElement` is available
- `_onBeforeUpdate(node, children)` — before a child update cycle; inspect incoming raw children
- `_onUpdate(node)` — after the update cycle; children and DOM reflect the latest state
- `_onBeforeRemove(node, done)` — before removal; **must** call `done()` to proceed
- `_onRemove(node)` — after removal
- `_onError(node, error, reset)` — catches errors thrown by reactive children in this subtree; call `reset()` to clear children and render fallback UI

## Refs

```tsx
// React
const inputRef = useRef<HTMLInputElement>(null)
inputRef.current?.focus()
```

```ts
// Domphy — access DOM via _onMount
{
  input: null,
  type: "text",
  _onMount: (node) => {
    node.domElement?.focus()
  },
}
```

`node.domElement` is the actual DOM element. Access it in `_onMount` (or later) when the element is in the DOM.

## Lists and keys

```tsx
// React
items.map(item => <li key={item.id}>{item.name}</li>)
```

```ts
// Domphy
(l) => items.get(l).map(item => ({ li: item.name, _key: item.id }))
```

`_key` is the Domphy equivalent of React's `key` prop. Required on dynamic lists (returned from a reactive function) so the reconciler can track reorders. The doctor's `missing-key` rule catches lists without it.

## Code splitting

```tsx
// React (Next.js)
const HeavyPage = lazy(() => import('./HeavyPage'))
```

```ts
// Domphy (@domphy/app)
const route = {
  path: "/heavy",
  lazy: () => import("./HeavyPage"),
}
```

`@domphy/app` supports lazy routes with automatic prefetching and SSR streaming.

## Data fetching

```tsx
// React Query
const { data, isLoading } = useQuery({ queryKey: ["user"], queryFn: fetchUser })
```

```ts
// @domphy/query — same API, Domphy adapter
import { createQuery } from "@domphy/query/domphy"

const query = createQuery(() => ({
  queryKey: ["user"],
  queryFn: fetchUser,
}))
// read: (l) => query.get(l).data
```

The adapter `createQuery` wraps TanStack query-core with Domphy's listener-based reactivity. The `queryKey`, `queryFn`, `staleTime`, and all other options are identical.

## Routing

```tsx
// React Router
<Route path="/users/:id" element={<UserPage />} />
```

```ts
// @domphy/router — TanStack Router port
import { createRoute } from "@domphy/router"

const route = createRoute({
  path: "/users/$id",
  component: () => ({ div: "User page" }),
})
```

The API is the TanStack Router API. If you know TanStack Router, you know `@domphy/router`.

## Forms

```tsx
// React Hook Form
const { register, handleSubmit } = useForm()
<input {...register("email")} />
```

```ts
// @domphy/form — TanStack Form port
import { createForm } from "@domphy/form/domphy"

const form = createForm({
  defaultValues: { email: "" },
  onSubmit: ({ value }) => console.log(value),
})

const emailField = form.field("email")

const App = {
  form: null,
  onSubmit: (e) => { e.preventDefault(); form.handleSubmit() },
  $: [/* form layout */],
}
const input = {
  input: null,
  type: "email",
  value: (l) => emailField.value(l),
  onInput: (e) => emailField.handleChange((e.target as HTMLInputElement).value),
}
```

## Animations

```tsx
// Framer Motion
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
```

```ts
// Domphy — motion() patch (Web Animations API, no third-party dep)
{ div: "Content", $: [motion({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } })] }
```

`motion()` uses the Web Animations API natively. Enter/exit animations tie into Domphy's `_onMount`/`_onBeforeRemove` lifecycle — no extra library.

## Error boundaries

```tsx
// React
<ErrorBoundary fallback={<p>Something went wrong.</p>}>
  <RiskyComponent />
</ErrorBoundary>
```

```ts
// Domphy — errorBoundary() patch
import { errorBoundary } from "@domphy/ui"

{
  div: (l) => renderRiskyContent(l),
  $: [
    errorBoundary({
      fallback: (error, reset) => ({
        div: [
          { p: `Error: ${String(error)}` },
          { button: "Try again", onClick: reset },
        ],
      }),
      onError: (error) => reportToSentry(error),
    }),
  ],
}
```

The `errorBoundary()` patch catches errors thrown by reactive child expressions in the subtree. Calling `reset()` clears the boundary so the next reactive evaluation runs again. Static construction errors propagate normally.

## Global config

```ts
// React (no built-in equivalent — depends on the renderer)

// Domphy — call once before mounting
import { configure } from "@domphy/core"

configure({ cspNonce: "abc123" })
```

`configure({ cspNonce })` stamps a CSP nonce on every `<style>` element Domphy injects. Required when your Content-Security-Policy uses `style-src 'nonce-...'` instead of `'unsafe-inline'`. Call it before the first `render()`.

## The mental model shift in one sentence

React: **components own state and render JSX**.  
Domphy: **plain objects describe DOM; patches inject behavior; state values update reactive parts**.

## Next steps

- [Core syntax](/docs/core/syntax) — the full element object format
- [Reactivity](/docs/core/reactivity) — toState, computed, effect, batch
- [Patches overview](/docs/ui/) — the 86 built-in patches
- [Quickstart](/docs/quickstart) — hands-on 5-minute intro
