<script setup lang="ts">

import Basic from "../demos/query/basic.ts?raw"
</script>

# Query

`@domphy/query` provides async state management for Domphy apps: fetching, caching, deduplication, background refetching, mutations, infinite queries, and SSR hydration.

It is a **1-1 port of [`@tanstack/query-core`](https://github.com/TanStack/query/tree/main/packages/query-core) v5.90.20** (MIT, © Tanner Linsley and the TanStack team). The source is kept byte-identical to upstream, so the entire [TanStack Query core reference](https://tanstack.com/query/latest/docs/reference/QueryClient) applies as-is, and future upstream versions can be diffed and merged directly.

Like the rest of Domphy, it is framework-agnostic and has zero dependencies — the bridge to the UI is plain `toState`.

## Install

::: code-group
```bash [NPM]
npm install @domphy/query
```
```html [CDN]
<script src="https://unpkg.com/@domphy/query/dist/query.global.js"></script>
```
:::

The CDN bundle exposes `Domphy.query` with all exports.

## Live Example

<CodeEditor :code="Basic" />

## Core Concepts

- **`QueryClient`** — owns the `QueryCache` and `MutationCache`. Create one per app, call `queryClient.mount()` once so window focus and reconnect refetching work.
- **`QueryObserver`** — subscribes to one query: runs the `queryFn`, caches the result under `queryKey`, and emits a result object on every state change.
- **`MutationObserver`** — runs create/update/delete operations with retry and lifecycle callbacks.
- **Query keys** — arrays like `["users", userId]`. Hashed structurally, so object key order does not matter. Keys are also the handle for invalidation and prefetching.

## The Bridge Pattern

::: tip
Most apps should use the [Domphy adapter](./adapter) (`createQuery` / `createMutation` / `createInfiniteQuery`) — it packages the pattern below into reactive accessors, and the live example above already uses it. Read on to understand what the adapter does under the hood.
:::

Domphy has no async primitive by design — async is a state problem, and state lives outside the UI. `@domphy/query` manages the async state; `toState` pushes results into the UI:

```ts
import { QueryClient, QueryObserver } from "@domphy/query"
import { toState } from "@domphy/core"

const queryClient = new QueryClient()
queryClient.mount()

const data = toState<User[] | undefined>(undefined)
const loading = toState(true)

const observer = new QueryObserver<User[]>(queryClient, {
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((res) => res.json()),
})

observer.subscribe((result) => {
    data.set(result.data)
    loading.set(result.isPending)
})
```

The UI reads the states reactively — nothing query-specific leaks into elements:

```ts
const App: DomphyElement<"ul"> = {
    ul: (l) => (data.get(l) ?? []).map((user) => ({
        li: user.name,
        _key: user.id,
    })),
    hidden: (l) => loading.get(l),
}
```

## What To Read Next

1. [Domphy Adapter](./adapter) for `createQuery` / `createMutation` / `createInfiniteQuery` — the recommended way to consume queries
1. [Queries](./queries) for `QueryObserver`, options, and a reusable `createQuery` helper
2. [Mutations](./mutations) for writes, callbacks, and optimistic updates
3. [Caching](./caching) for invalidation, prefetching, and the `staleTime` / `gcTime` model
4. [Infinite Queries](./infinite-queries) for pagination
5. [SSR & Hydration](./ssr) for server rendering with Domphy SSR
6. [API Reference](./api) for the full export list
