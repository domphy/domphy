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
const filteredItems = computed(() => {
  const f = filter.get()
  const all = items.get()
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

There is no `_if` key. Reserved keys are `_key`, `_portal`, `_context`, `_metadata`, `_behaviors`, `_doctorDisable`, `$`, and `_on*`. Conditional mount is `hidden` (keeps the node) or reactive children (return `null` until you want a tree).

```ts
import { toState } from "@domphy/core"

const activeTab = toState<"overview" | "analytics" | "settings">("overview")

const Tabs = {
  div: [
    { div: TabBar },
    // Always mounted; `hidden` preserves state when the tab is inactive
    {
      div: AnalyticsPanel,
      hidden: (l) => activeTab.get(l) !== "analytics",
    },
    // Deferred mount: no subtree until first selected (returning null again unmounts)
    {
      div: (l) => activeTab.get(l) === "settings" ? SettingsPanel : null,
    },
  ],
}
```

## Reactive `style` is per-property

`style` is a `StyleObject`. A function as the whole `style` value applies no CSS. Put reactivity on individual properties (or use a patch). Do not inline typography (`fontWeight`, `color`, …) — those belong on typography patches.

```ts
// Not supported — whole-object function, no CSS applied
{
  div: "Hello",
  style: (l) => ({ display: hidden.get(l) ? "none" : "block" }),
}

// Per-property functions
{
  div: "Hello",
  style: {
    display: (l) => hidden.get(l) ? "none" : "block",
  },
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
