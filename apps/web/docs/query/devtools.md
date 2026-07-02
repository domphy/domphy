---
title: "Devtools"
description: "Inspect query cache, monitor requests, and debug stale/fetching state with @domphy/query's programmatic introspection methods (no visual panel yet)."
---

# Devtools

:::warning In Development
`@domphy/query-devtools` and the `@domphy/query/devtools` subpath do not exist yet. There is no `QueryDevtools` component or `devtools()` patch to import — do NOT use them. Use `client.getQueryState()`/`client.getQueryCache().getAll()` for programmatic inspection in the meantime, as shown below.
:::

There is no visual devtools panel yet. Until one ships, use `QueryClient`'s own introspection methods to inspect every query in your app: keys, state (`pending`/`success`/`error`), staleness, `dataUpdatedAt`, and the cached data.

## Using devtools in tests

In integration tests, you can inspect query state programmatically without the visual panel:

```ts
import { QueryClient } from "@domphy/query"

const client = new QueryClient()

// After your async operations:
const queryState = client.getQueryState(["user", "123"])
console.log(queryState?.status)          // "success"
console.log(queryState?.dataUpdatedAt)   // timestamp
console.log(queryState?.data)            // cached data

// List all active queries:
const queries = client.getQueryCache().getAll()
queries.forEach(q => {
  console.log(q.queryKey, q.state.status, q.state.data)
})
```

## Debugging stale data

If a query shows data but it's not refreshing, check:

1. **`staleTime`** — set to `Infinity`? Check with `client.getQueryState(key)?.isStale`
2. **`enabled: false`** — query is disabled, won't refetch
3. **No observers** — no component is subscribed; GC may have cleared it
4. **Network tab** — is the request being made but returning cached data?

Force a refetch programmatically:

```ts
await client.invalidateQueries({ queryKey: ["user"] })
```
