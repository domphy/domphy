---
title: "Common Patterns"
description: "Reusable patterns: state machines, reducers, compound components, factory functions, and code organization."
---

# Common Patterns

## State machine

Manage complex multi-state UI (wizard, upload flow, auth) with an explicit state machine:

```ts
import { toState } from "@domphy/core"

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "success"; url: string }
  | { status: "error"; message: string }

const upload = toState<UploadState>({ status: "idle" })

async function startUpload(file: File) {
  upload.set({ status: "uploading", progress: 0 })
  try {
    const url = await uploadFile(file, (progress) => {
      upload.set({ status: "uploading", progress })
    })
    upload.set({ status: "success", url })
  } catch (error) {
    upload.set({ status: "error", message: (error as Error).message })
  }
}

const UploadUI = {
  div: (l) => {
    const state = upload.get(l)
    switch (state.status) {
      case "idle": return { button: "Upload file", onClick: () => fileInput.click() }
      case "uploading": return { div: `Uploading… ${state.progress}%` }
      case "success": return { a: "View file", href: state.url }
      case "error": return { div: `Error: ${state.message}` }
    }
  },
}
```

## Reducer pattern

For complex state transitions, centralize updates in a reducer:

```ts
import { toState } from "@domphy/core"

type CartAction =
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "UPDATE_QTY"; id: string; qty: number }
  | { type: "CLEAR" }

interface CartState { items: CartItem[]; total: number }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.item] }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter(i => i.id !== action.id) }
    case "UPDATE_QTY":
      return {
        ...state,
        items: state.items.map(i => i.id === action.id ? { ...i, qty: action.qty } : i),
      }
    case "CLEAR":
      return { items: [], total: 0 }
  }
}

const cart = toState<CartState>({ items: [], total: 0 })

function dispatch(action: CartAction) {
  cart.set(cartReducer(cart.get(), action))
}

// Usage
dispatch({ type: "ADD_ITEM", item: { id: "1", name: "Widget", qty: 1, price: 10 } })
dispatch({ type: "UPDATE_QTY", id: "1", qty: 3 })
```

## Component factory pattern

Create parameterized components (like React's Higher-Order Components) as plain functions:

```ts
import { themeColor } from "@domphy/theme"

// Factory that creates a styled badge with a given variant
function badge(variant: "success" | "error" | "warning" | "info") {
  const colorMap = {
    success: "success",
    error: "error",
    warning: "warning",
    info: "info",
  } as const

  return function Badge(text: string) {
    return {
      span: text,
      style: {
        background: (l) => themeColor(l, "shift-2", colorMap[variant]),
        color: (l) => themeColor(l, "shift-10", colorMap[variant]),
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "0.75rem",
      },
    }
  }
}

const SuccessBadge = badge("success")
const ErrorBadge = badge("error")

// Usage
{ div: [SuccessBadge("Active"), ErrorBadge("Failed")] }
```

## Per-node behavior (imperative state that survives re-renders)

A patch factory called inside a reactive parent gets a brand-new closure every time that parent re-renders — even though the DOM node it patches is reused. Lifecycle hooks like `_onMount` only fire ONCE for that real node, so imperative side effects wired there (a document-level listener, a `ResizeObserver`) stay bound to the FIRST-ever generation's closure forever, while live-rebound event handlers (`onClick`) move on to whatever generation is current. See [Reused-node lifecycle](https://github.com/domphy/domphy/blob/main/AGENTS.md#reused-node-lifecycle--the-gotchas-behind-most-real-bugs) for the full failure mode.

`behavior(key, attach, props)` fixes this: `attach(node, props)` runs once for the real node; every later re-render's `props` are routed into that SAME instance via `update()`, not lost with the discarded closure; `destroy()` fires exactly once when the node is removed.

```ts
import { behavior, toState, type PartialElement } from "@domphy/core"

function clickOutside(props: { onOutside: () => void }): PartialElement {
  return behavior(
    "click-outside",
    (node, props) => {
      // Runs ONCE for this node, no matter how many re-renders happen.
      const handler = (event: MouseEvent) => {
        if (!node.domElement?.contains(event.target as Node)) props.onOutside()
      }
      document.addEventListener("click", handler)
      return {
        update: (nextProps) => { props = nextProps }, // fresh onOutside every re-render
        destroy: () => document.removeEventListener("click", handler),
      }
    },
    props,
  )
}

const isOpen = toState(false)

const Menu = {
  div: [{ p: "Menu content" }],
  $: [clickOutside({ onOutside: () => isOpen.set(false) })],
  hidden: (l) => !isOpen.get(l),
}
```

Compose it with other patch fields via object spread, `merge()`, or `$` — `behavior()` just returns a `{ _behaviors: {...} }` fragment keyed so multiple concerns on one element ($-composed patches) don't collide. See `@domphy/ui`'s `packages/ui/src/utils/floating.ts` (shared by `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker`) for a full real-world instance: a persistent per-anchor "floating panel" state (position cleanup, outside-click dismissal, Escape-to-close) that used to be a hand-rolled `WeakMap<Element, ...>` generation-eviction workaround.

## Compound component pattern

Build components that share state without prop-drilling:

```ts
import { toState } from "@domphy/core"

function createAccordion() {
  const openItems = toState<Set<string>>(new Set())

  function toggleItem(id: string) {
    const next = new Set(openItems.get())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    openItems.set(next)
  }

  function Item(id: string, header: string, content: DomphyElement) {
    return {
      div: [
        {
          button: header,
          onClick: () => toggleItem(id),
          "aria-expanded": (l) => String(openItems.get(l).has(id)),
        },
        {
          div: content,
          hidden: (l) => !openItems.get(l).has(id),
        },
      ],
    }
  }

  return { Item }
}

const { Item } = createAccordion()

const FAQ = {
  div: [
    Item("q1", "What is Domphy?", { p: "UI as plain JS objects." }),
    Item("q2", "Does it use JSX?", { p: "No JSX — plain objects only." }),
    Item("q3", "Does it have a virtual DOM?", { p: "No virtual DOM." }),
  ],
}
```

## List with key tracking

When list items change (add/remove/reorder), use `_key` for correct reconciliation:

```ts
import { toState } from "@domphy/core"

interface Task { id: string; text: string; done: boolean }

const tasks = toState<Task[]>([
  { id: "t1", text: "Write tests", done: false },
  { id: "t2", text: "Deploy", done: true },
])

const TaskList = {
  ul: (l) => tasks.get(l).map(task => ({
    li: task.text,
    _key: task.id,   // stable key — tells reconciler to MOVE this item, not re-create it
    class: task.done ? "done" : "",
  })),
}
```

Without `_key`, reordering a list destroys and recreates all DOM nodes. With `_key`, Domphy moves the existing nodes.

## Async data loading pattern

```ts
import { toState, computed } from "@domphy/core"

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error }

function createAsyncState<T>() {
  const state = toState<AsyncState<T>>({ status: "idle" })

  async function load(fn: () => Promise<T>) {
    state.set({ status: "loading" })
    try {
      const data = await fn()
      state.set({ status: "success", data })
    } catch (error) {
      state.set({ status: "error", error: error as Error })
    }
  }

  const data = computed((): T | undefined => {
    const s = state.get()
    return s.status === "success" ? s.data : undefined
  })

  const isLoading = computed(() => state.get().status === "loading")
  const error = computed(() => {
    const s = state.get()
    return s.status === "error" ? s.error : null
  })

  return { state, load, data, isLoading, error }
}
```

## Module structure

Organize a feature module:

```
features/
  posts/
    state.ts        ← toState, RecordState, computed
    api.ts          ← fetch functions (no Domphy imports)
    components.ts   ← DomphyElement definitions
    index.ts        ← re-exports
```

```ts
// features/posts/state.ts
import { toState, computed } from "@domphy/core"
import type { Post } from "./api"

export const posts = toState<Post[]>([])
export const selectedId = toState<string | null>(null)
export const selectedPost = computed(() =>
  posts.get().find(p => p.id === selectedId.get()) ?? null
)
```

## Debounced state

Rate-limit expensive operations triggered by rapid state changes:

```ts
import { toState, effect } from "@domphy/core"

const query = toState("")
const results = toState<SearchResult[]>([])

effect(() => {
  const text = query.get()
  if (!text) { results.set([]); return }

  const timer = setTimeout(async () => {
    const data = await search(text)
    results.set(data)
  }, 300)

  return () => clearTimeout(timer)   // cleanup cancels previous timer
})
```
