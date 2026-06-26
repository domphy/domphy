---
title: "Performance"
description: "Batch updates, computed state, granular subscriptions, lazy rendering, and avoiding unnecessary re-renders."
---

# Performance

Domphy's listener model is inherently granular — only elements that call `state.get(l)` with a listener re-render when that state changes. This section covers patterns for keeping updates fast at scale.

## Granular subscriptions

The most important rule: **read state as deeply as possible**. An element only re-renders when the state it subscribed to changes.

```ts
// BAD — entire list re-renders when any user field changes
const UserList = {
  ul: (l) => users.get(l).map((user) => ({ li: user.name })),
}

// GOOD — each row subscribes independently; only the changed row re-renders
const UserRow = (userId: string) => ({
  li: (l) => users.get(l).find((u) => u.id === userId)?.name ?? "",
})

const UserList = {
  ul: (l) => users.get(l).map((user) => ({
    ...UserRow(user.id),
    _key: user.id,
  })),
}
```

For lists, always provide `_key`. Without a key, Domphy cannot match old elements to new elements and must re-create everything.

## Computed state

Use `computed` to memoize derived values. `computed` tracks its own dependencies — it only re-runs when those specific dependencies change:

```ts
import { toState, computed } from "@domphy/core"

const items = toState<Item[]>([])
const filter = toState<"all" | "active" | "done">("all")

// Only re-runs when items OR filter changes
const filteredItems = computed((l) => {
  const f = filter.get(l)
  const all = items.get(l)
  return f === "all" ? all : all.filter((i) => i.status === f)
})

const ItemCount = {
  span: (l) => `${filteredItems.get(l).length} items`,
}
```

Without `computed`, `ItemCount` would re-run its full filter logic on every `items` change even when `filter` hasn't changed.

## Batch updates

When updating multiple states in response to one event, batch them to trigger a single re-render pass:

```ts
import { batch } from "@domphy/core"

function applySettings(newTheme: string, newLocale: string) {
  batch(() => {
    theme.set(newTheme)
    locale.set(newLocale)
    // ... more state changes
  })
  // Elements subscribed to both re-render once, not twice
}
```

Without `batch`, each `set` triggers a separate notification cycle. For 3+ state changes in one handler, always batch.

## Lazy / deferred rendering

For heavy sections that are off-screen or behind a tab, defer their initial render:

```ts
import { toState } from "@domphy/core"

const activeTab = toState<"overview" | "analytics" | "settings">("overview")
const tabMounted = toState({ overview: true, analytics: false, settings: false })

// Only mount a tab's content once it has been viewed
activeTab.subscribe((tab) => {
  tabMounted.set((m) => ({ ...m, [tab]: true }))
})

const Tabs = {
  div: [
    // Tab buttons
    { div: TabBar },
    // Tab panels — use 'hidden' rather than conditional render to preserve state
    {
      div: AnalyticsPanel,
      hidden: (l) => activeTab.get(l) !== "analytics",
      // Only mount once tabMounted.analytics is true
      _if: (l) => tabMounted.get(l).analytics,
    },
  ],
}
```

## Avoiding object allocation in render functions

Creating new objects inside a render function can cause downstream listeners to re-render unnecessarily (referential inequality). For static config, define it outside the function:

```ts
// BAD — new style object on every render
const Label = {
  span: (l) => text.get(l),
  style: (l) => ({ color: "blue", fontWeight: "bold" }),  // new object each time
}

// GOOD — static object defined once
const LABEL_STYLE = { color: "blue", fontWeight: "bold" }

const Label = {
  span: (l) => text.get(l),
  style: LABEL_STYLE,
}
```

## `RecordState` for field-level granularity

`RecordState` lets you subscribe to individual fields of an object instead of the whole object:

```ts
import { RecordState } from "@domphy/core"

const form = new RecordState({ name: "", email: "", bio: "" })

// Only re-renders when 'name' changes, not when 'email' or 'bio' change
const NameField = {
  input: null,
  value: (l) => form.get("name", l),
  onInput: (e) => form.set("name", (e.target as HTMLInputElement).value),
}
```

vs `toState` where reading `form.get(l)` subscribes to the whole object.

## Large lists — virtualization

For 100+ items, render only what's visible using `@domphy/virtual`. See the [Virtual docs](/docs/virtual/).

## Profiling

Identify slow re-renders in the browser:

1. Open DevTools → Performance tab
2. Record while interacting
3. Look for long "Scripting" blocks — they indicate expensive listener callbacks

Or add timing in development:

```ts
import { toState } from "@domphy/core"

function timedState<T>(initial: T, name: string) {
  const state = toState(initial)
  const original = state.set.bind(state)
  state.set = (...args) => {
    const t = performance.now()
    original(...args)
    console.debug(`${name}.set took ${(performance.now() - t).toFixed(2)}ms`)
  }
  return state
}
```

## Checklist

- [ ] All dynamic lists have `_key` on each item
- [ ] Derived values use `computed` rather than re-computing in every listener
- [ ] Multiple state updates in one handler use `batch()`
- [ ] Off-screen / tabbed content uses `hidden` or deferred mount rather than eager rendering
- [ ] Lists > 200 items use `@domphy/virtual`
- [ ] `RecordState` used when only individual fields update independently
