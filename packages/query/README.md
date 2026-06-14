# @domphy/query

Framework-agnostic async state management for Domphy apps: fetching, caching, background refetching, mutations, infinite queries, and SSR hydration.

This package is a 1-1 port of [`@tanstack/query-core`](https://github.com/TanStack/query/tree/main/packages/query-core) v5.90.20 (MIT, © Tanner Linsley). The source is kept byte-identical to upstream so future versions can be diffed and merged directly. All credit for the design and implementation goes to the TanStack Query team.

## Install

```bash
npm install @domphy/query
```

## Quick Example

```ts
import { QueryClient, QueryObserver } from "@domphy/query"
import { toState } from "@domphy/core"

const queryClient = new QueryClient()
queryClient.mount()

const users = toState<{ id: number; name: string }[] | undefined>(undefined)
const loading = toState(true)

const observer = new QueryObserver(queryClient, {
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((response) => response.json()),
})

observer.subscribe((result) => {
    users.set(result.data)
    loading.set(result.isPending)
})
```

States drive Domphy reactivity automatically:

```ts
const App = {
    ul: (listener) => (users.get(listener) ?? []).map((user) => ({
        li: user.name,
        _key: user.id,
    })),
    hidden: (listener) => loading.get(listener),
}
```

## What It Includes

- `QueryClient` / `QueryCache` — fetch, cache, deduplicate, invalidate
- `QueryObserver` / `QueriesObserver` — subscribe to query results
- `MutationObserver` / `MutationCache` — create/update/delete with retry
- `InfiniteQueryObserver` — paginated and cursor-based data
- `focusManager` / `onlineManager` — refetch on window focus and reconnect
- `hydration` — serialize the cache on the server, hydrate on the client

## Documentation

- [Query docs](https://www.domphy.com/docs/query/)
- The API is identical to [TanStack Query core](https://tanstack.com/query/latest/docs/reference/QueryClient) — its reference applies as-is.

## License

MIT — see [LICENSE](./LICENSE). Contains code from TanStack Query, also MIT.
