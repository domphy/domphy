# Queries

A query is a declarative dependency on async data, identified by a `queryKey`. `QueryObserver` runs the `queryFn`, caches the result, deduplicates concurrent requests for the same key, and notifies subscribers on every state change.

## Basic Query

```ts
import { QueryClient, QueryObserver } from "@domphy/query"

const queryClient = new QueryClient()
queryClient.mount()

const observer = new QueryObserver(queryClient, {
    queryKey: ["todos"],
    queryFn: () => fetch("/api/todos").then((res) => res.json()),
})

const unsubscribe = observer.subscribe((result) => {
    console.log(result.status, result.data)
})
```

`subscribe` returns an unsubscribe function. When the last subscriber leaves, the query becomes inactive and is garbage-collected after `gcTime`.

## A Reusable Query State Helper

Most Domphy apps wrap the observer bridge once and reuse it. Note: this manual pattern is an alternative to the adapter's `createQuery` from `@domphy/query/domphy` (which takes a `QueryClient` + options directly and is the recommended approach for most use cases).

```ts
import { QueryClient, QueryObserver } from "@domphy/query"
import { toState } from "@domphy/core"

const queryClient = new QueryClient()
queryClient.mount()

function makeQueryStates<T>(
    client: QueryClient,
    options: { queryKey: unknown[]; queryFn: () => Promise<T> },
) {
    const data = toState<T | undefined>(undefined)
    const loading = toState(true)
    const fetching = toState(false)
    const error = toState<Error | null>(null)

    const observer = new QueryObserver<T>(client, options)

    observer.subscribe((result) => {
        data.set(result.data)
        loading.set(result.isPending)
        fetching.set(result.isFetching)
        error.set(result.error as Error | null)
    })

    return { data, loading, fetching, error, observer }
}

const todos = makeQueryStates(queryClient, {
    queryKey: ["todos"],
    queryFn: () => fetch("/api/todos").then((res) => res.json()),
})
```

Each `toState` is independent — the UI re-renders only the parts that read the changed state.

## Query Keys

Keys are arrays, hashed structurally:

```ts
["todos"]                       // all todos
["todos", 5]                    // one todo
["todos", { status: "done" }]   // filtered list — object key order does not matter
```

Anything serializable works. The key should contain every variable the `queryFn` depends on — changing the key creates a new cache entry and triggers a fetch.

## Dynamic Keys

Change the key with `setOptions` — the observer switches to the new cache entry:

```ts
const page = toState(1)

page.addListener(() => {
    observer.setOptions({
        queryKey: ["todos", { page: page.get() }],
        queryFn: () => fetch(`/api/todos?page=${page.get()}`).then((res) => res.json()),
        placeholderData: keepPreviousData,
    })
})
```

With `placeholderData: keepPreviousData`, the previous page's data stays visible while the next page loads (`result.isPlaceholderData` is `true` during that window).

## Important Options

| Option | Default | Meaning |
|---|---|---|
| `staleTime` | `0` | How long data is considered fresh. Fresh data is served from cache without refetching. |
| `gcTime` | `5 * 60 * 1000` | How long inactive data stays in cache before garbage collection. |
| `enabled` | `true` | Set `false` to prevent fetching (dependent queries). |
| `retry` | `3` | Retry count on failure (`false` to disable, or a function). |
| `refetchOnWindowFocus` | `true` | Refetch stale queries when the window regains focus. |
| `refetchOnReconnect` | `true` | Refetch stale queries when the network reconnects. |
| `refetchInterval` | `false` | Poll on an interval (ms). |
| `select` | — | Transform/derive data without touching the cache. |
| `placeholderData` | — | Data shown while pending; `keepPreviousData` keeps the last result across key changes. |
| `initialData` | — | Seed the cache entry itself. |

## Disabling With `skipToken`

For type-safe conditional fetching, pass `skipToken` as the `queryFn`:

```ts
import { skipToken } from "@domphy/query"

const userId = toState<number | null>(null)

observer.setOptions({
    queryKey: ["user", userId.get()],
    queryFn: userId.get() === null
        ? skipToken
        : () => fetch(`/api/users/${userId.get()}`).then((res) => res.json()),
})
```

## The Result Object

Every notification carries a full snapshot:

- `data`, `error`
- `status`: `"pending" | "error" | "success"`
- `fetchStatus`: `"fetching" | "paused" | "idle"`
- `isPending`, `isSuccess`, `isError` — derived from `status`
- `isFetching` — any fetch in flight, including background refetch
- `isLoading` — first fetch only (`isPending && isFetching`)
- `isStale`, `isPlaceholderData`, `isRefetching`
- `dataUpdatedAt`, `errorUpdatedAt`, `failureCount`
- `refetch()` — imperative refetch

Typical mapping: drive a `spinner()` from `isPending`, a subtle inline indicator from `isFetching`, and an `alert({ color: "error" })` from `error`.

## Multiple Queries At Once

`QueriesObserver` subscribes to a dynamic list of queries in one subscription:

```ts
import { QueriesObserver } from "@domphy/query"

const observer = new QueriesObserver(queryClient, [
    { queryKey: ["user", 1], queryFn: fetchUser(1) },
    { queryKey: ["user", 2], queryFn: fetchUser(2) },
])

observer.subscribe((results) => {
    // results is an array of result objects, same order as options
})
```
