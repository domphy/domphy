<script setup lang="ts">
import Basic from "../demos/query/basic.ts?raw"
import Mutation from "../demos/query/mutation.ts?raw"
</script>

# Domphy Adapter

The [bridge pattern](./) — `observer.subscribe(...)` pushing into `toState` — works everywhere, but it is the same boilerplate in every component. `@domphy/query/domphy` packages it once: a thin adapter that binds the observers to Domphy reactivity and hands you reactive accessors.

```bash
npm install @domphy/query @domphy/core
```

`@domphy/core` is a **peer dependency** of the adapter — it is the only part of `@domphy/query` that touches Domphy, so the main `@domphy/query` entry stays dependency-free. Import the adapter from the `/domphy` subpath:

```ts
import { createQuery, createInfiniteQuery, createMutation } from "@domphy/query/domphy"
```

## createQuery

`createQuery(client, options)` constructs a `QueryObserver`, subscribes it, and returns a handle whose accessors are reactive — pass the listener `l` and the element re-renders when that field changes.

<CodeEditor :code="Basic" />

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"

const queryClient = new QueryClient()
queryClient.mount()

const users = createQuery<User[]>(queryClient, {
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((res) => res.json()),
})

const App: DomphyElement<"ul"> = {
    ul: (l) => (users.data(l) ?? []).map((user) => ({
        li: user.name,
        _key: user.id,
    })),
    hidden: (l) => users.isPending(l),
}
```

### Accessors

Every accessor takes an optional listener and returns the live value:

| Accessor | Returns |
| --- | --- |
| `data(l)` | `TData \| undefined` |
| `error(l)` | `TError \| null` |
| `status(l)` | `"pending" \| "error" \| "success"` |
| `fetchStatus(l)` | `"fetching" \| "paused" \| "idle"` |
| `isPending(l)` / `isLoading(l)` | `boolean` |
| `isFetching(l)` / `isRefetching(l)` | `boolean` |
| `isSuccess(l)` / `isError(l)` | `boolean` |
| `isStale(l)` | `boolean` |

Plus the imperative members: `refetch(options?)`, `setOptions(options)`, the raw `observer`, the underlying `state` (a `RecordState`), and `destroy()`.

### Per-field reactivity

Each result field is an independent key in a `RecordState`, and updates are diffed by reference before they notify. A component that reads only `data` does **not** re-render when `isFetching` toggles, and refetching a query that returns the same value re-renders nothing:

```ts
{ ul: (l) => users.data(l) }              // re-renders only when data changes
{ span: (l) => users.isFetching(l) ? "↻" : "" } // re-renders only on fetch toggles
```

### Cleanup

The observer subscribes for the life of the handle. When the owning subtree unmounts, release it from a lifecycle hook:

```ts
{
    ul: (l) => (users.data(l) ?? []).map(...),
    _onRemove: () => users.destroy(),
}
```

Top-level queries that live as long as the page need no cleanup.

## createMutation

`createMutation(client, options)` returns a handle with the same reactive accessors plus `mutate` / `mutateAsync`.

<CodeEditor :code="Mutation" />

```ts
import { createMutation } from "@domphy/query/domphy"

const save = createMutation<Post, Error, { title: string }>(queryClient, {
    mutationFn: (input) =>
        fetch("/api/posts", { method: "POST", body: JSON.stringify(input) }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
})

const SaveButton: DomphyElement<"button"> = {
    button: (l) => (save.isPending(l) ? "Saving…" : "Save"),
    ariaDisabled: (l) => save.isPending(l),
    onClick: () => save.mutate({ title: "Hello" }),
}
```

- `mutate(variables, options?)` is fire-and-forget — rejections are swallowed, read them via `save.error(l)`.
- `mutateAsync(variables, options?)` returns the promise so you can `await`/`catch`.
- Accessors: `data`, `error`, `variables`, `status`, `isPending`, `isSuccess`, `isError`, `isIdle`. Plus `reset()` and `destroy()`.

## createInfiniteQuery

`createInfiniteQuery(client, options)` wraps `InfiniteQueryObserver` and adds the page accessors:

```ts
import { createInfiniteQuery } from "@domphy/query/domphy"

const feed = createInfiniteQuery<Page>(queryClient, {
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => fetch(`/api/feed?cursor=${pageParam}`).then((r) => r.json()),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
})

const Feed: DomphyElement<"div"> = {
    div: [
        {
            ul: (l) =>
                (feed.data(l)?.pages ?? []).flatMap((page) =>
                    page.items.map((item) => ({ li: item.title, _key: item.id })),
                ),
        },
        {
            button: "Load more",
            ariaDisabled: (l) => !feed.hasNextPage(l) || feed.isFetchingNextPage(l),
            onClick: () => feed.fetchNextPage(),
        },
    ],
}
```

InfiniteQueryHandle accessors: `data`, `error`, `status`, `isPending`, `isFetching`, `isSuccess`, `isError`, `hasNextPage`, `hasPreviousPage`, `isFetchingNextPage`, `isFetchingPreviousPage`; methods: `fetchNextPage`, `fetchPreviousPage`, `refetch`, `destroy`. Note: `fetchStatus`, `isLoading`, `isRefetching`, `isStale`, and `setOptions` are not available on the infinite variant.

## When to use the bridge directly

The adapter covers the common cases. Reach for the raw [bridge pattern](./) when you need full control over which result fields drive which states, or when wiring a query into an existing custom state model. The adapter is built on exactly that bridge — there is no hidden machinery.
