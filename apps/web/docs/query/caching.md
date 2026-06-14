# Caching

Every query result lives in the `QueryCache` under its hashed `queryKey`. Understanding two timers explains almost all cache behavior:

- **`staleTime`** (default `0`) — how long data is *fresh*. Fresh data is served from cache with no network request. Stale data is still served instantly, but a background refetch fires.
- **`gcTime`** (default 5 minutes) — how long *inactive* data (no subscribers) stays in memory before being garbage-collected.

```
fetch ──► fresh ──staleTime──► stale ──last subscriber leaves──► inactive ──gcTime──► gone
```

The default `staleTime: 0` means "always refetch in the background when a query is used again" — data on screen is never blocked, just silently updated. Raise `staleTime` for data that rarely changes.

## Reading And Writing The Cache

```ts
queryClient.getQueryData(["todos"])             // read, undefined if absent
queryClient.setQueryData(["todos"], todos)      // write
queryClient.setQueryData<Todo[]>(["todos"], (old) => [...(old ?? []), newTodo])
```

`setQueryData` notifies every observer on that key — bridged states update immediately.

## Invalidation

`invalidateQueries` marks matching queries stale and refetches the active ones:

```ts
// everything under ["todos"] — ["todos"], ["todos", 5], ["todos", {page: 2}] ...
queryClient.invalidateQueries({ queryKey: ["todos"] })

// exactly ["todos"]
queryClient.invalidateQueries({ queryKey: ["todos"], exact: true })

// everything
queryClient.invalidateQueries()
```

This is the standard pattern after a mutation: the server changed, so ask again.

## Prefetching

Warm the cache before the user needs it — on hover, on route intent, at boot:

```ts
queryClient.prefetchQuery({
    queryKey: ["todo", id],
    queryFn: () => fetchTodo(id),
    staleTime: 10_000,
})
```

`prefetchQuery` never throws; errors are cached like any query error. Use `fetchQuery` instead when you need the data (it returns the data and throws on failure):

```ts
const todos = await queryClient.fetchQuery({ queryKey: ["todos"], queryFn: fetchTodos })
```

If fresh data already exists in cache, both return it without a request.

## Other Cache Operations

```ts
await queryClient.cancelQueries({ queryKey: ["todos"] })  // abort in-flight fetches
queryClient.removeQueries({ queryKey: ["todos"] })        // drop entries entirely
await queryClient.resetQueries({ queryKey: ["todos"] })   // back to initial state, refetch active
await queryClient.refetchQueries({ queryKey: ["todos"] }) // force refetch, ignores staleTime
queryClient.clear()                                       // empty both caches
```

In-flight `queryFn`s receive an `AbortSignal` — pass it to `fetch` so `cancelQueries` aborts the request itself:

```ts
queryFn: ({ signal }) => fetch("/api/todos", { signal }).then((res) => res.json())
```

## Query Filters

Most `QueryClient` methods accept a filter object:

| Filter | Meaning |
|---|---|
| `queryKey` | Prefix match by default |
| `exact` | Match the key exactly |
| `type` | `"active"`, `"inactive"`, or `"all"` |
| `stale` | Only stale (or only fresh) queries |
| `fetchStatus` | `"fetching"`, `"paused"`, `"idle"` |
| `predicate` | `(query) => boolean` for anything else |

```ts
queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "todos" && (query.queryKey[1] as number) > 10,
})
```

## Default Options

Set app-wide defaults once on the client:

```ts
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})
```

Per-key defaults are also supported with `queryClient.setQueryDefaults(["todos"], { staleTime: 10_000 })`.

## Focus And Online Refetching

`queryClient.mount()` subscribes the cache to two singletons:

- `focusManager` — refetches stale active queries when the window regains focus
- `onlineManager` — pauses fetches offline and resumes/refetches on reconnect

Both are exported and overridable (useful in tests or non-browser environments):

```ts
import { focusManager, onlineManager } from "@domphy/query"

focusManager.setFocused(true)   // force
onlineManager.setOnline(false)  // simulate offline
```
