# @domphy/query

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/query/) · [npm](https://www.npmjs.com/package/@domphy/query)

Framework-agnostic async state management for Domphy apps: fetching, caching, background refetching, mutations, infinite queries, and SSR hydration.


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

- [Query docs](https://domphy.com/docs/query/)

## License

MIT — see [LICENSE](./LICENSE).
