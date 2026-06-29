# @domphy/query

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/query/) · [npm](https://www.npmjs.com/package/@domphy/query)

Framework-agnostic async state management for Domphy apps: fetching, caching, background refetching, mutations, infinite queries, and SSR hydration.


## Install

```bash
npm install @domphy/query
```

## Quick Example (Domphy adapter)

The recommended way to use `@domphy/query` in Domphy apps is through the Domphy adapter at `@domphy/query/domphy`:

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"

const client = new QueryClient()
client.mount()

const usersQuery = createQuery(client, {
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
})

const App = {
    ul: (l) => (usersQuery.data(l) ?? []).map((user) => ({
        li: user.name,
        _key: user.id,
    })),
    hidden: (l) => usersQuery.isPending(l),
}
```

`createQuery` returns a handle with reactive accessors: `data(l)`, `isPending(l)`, `isError(l)`, `error(l)`, `status(l)`, `isFetching(l)`, etc. — each accepts a listener for fine-grained subscriptions.

## What It Includes

- `createQuery(client, options)` — reactive query handle (adapter at `@domphy/query/domphy`)
- `createMutation(client, options)` — reactive mutation handle
- `createInfiniteQuery(client, options)` — paginated / cursor-based query handle
- `bindResult(initial, subscribe)` — wire any observer to Domphy reactivity
- `QueryClient` / `QueryCache` — fetch, cache, deduplicate, invalidate
- `QueryObserver` / `QueriesObserver` — low-level observer API
- `MutationObserver` / `MutationCache` — create/update/delete with retry
- `InfiniteQueryObserver` — paginated and cursor-based data
- `focusManager` / `onlineManager` — refetch on window focus and reconnect
- `hydration` — serialize the cache on the server, hydrate on the client

## Documentation

- [Query docs](https://domphy.com/docs/query/)

## License

MIT — see [LICENSE](./LICENSE).
