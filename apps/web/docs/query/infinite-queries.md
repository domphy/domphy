# Infinite Queries

`InfiniteQueryObserver` handles "load more" and infinite scroll. Instead of one value, the cached data is `{ pages: [...], pageParams: [...] }`, and each fetch appends (or prepends) a page.

## Basic Usage

```ts
import { QueryClient, InfiniteQueryObserver } from "@domphy/query"
import { toState } from "@domphy/core"

const queryClient = new QueryClient()
queryClient.mount()

const items = toState<Item[]>([])
const hasMore = toState(false)
const loadingMore = toState(false)

const observer = new InfiniteQueryObserver<{ items: Item[]; nextCursor: number | null }>(queryClient, {
    queryKey: ["feed"],
    queryFn: ({ pageParam }) =>
        fetch(`/api/feed?cursor=${pageParam}`).then((res) => res.json()),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor, // null/undefined = no more pages
})

observer.subscribe((result) => {
    items.set(result.data?.pages.flatMap((page) => page.items) ?? [])
    hasMore.set(result.hasNextPage)
    loadingMore.set(result.isFetchingNextPage)
})
```

Flattening `pages` into one `toState` list keeps the UI a plain keyed list:

```ts
const App: DomphyElement<"div"> = {
    div: [
        {
            ul: (l) => items.get(l).map((item) => ({
                li: item.title,
                _key: item.id,
            })),
        },
        {
            button: (l) => (loadingMore.get(l) ? "Loading..." : "Load more"),
            $: [button()],
            hidden: (l) => !hasMore.get(l),
            onClick: () => observer.fetchNextPage(),
        },
    ],
}
```

## Page Parameters

- `initialPageParam` — the param for the first page (required)
- `getNextPageParam(lastPage, allPages, lastPageParam, allPageParams)` — returns the next param, or `null`/`undefined` when there are no more pages
- `getPreviousPageParam` — same, for bidirectional lists (`fetchPreviousPage()`)

## Result Additions

On top of the normal query result:

- `data.pages`, `data.pageParams`
- `hasNextPage`, `hasPreviousPage`
- `fetchNextPage()`, `fetchPreviousPage()`
- `isFetchingNextPage`, `isFetchingPreviousPage`

## Refetching Behavior

When an infinite query refetches (invalidation, window focus), every fetched page is refetched **sequentially** from the first, so cursors stay consistent. Use `maxPages` to cap how many pages stay in cache:

```ts
new InfiniteQueryObserver(queryClient, {
    queryKey: ["feed"],
    queryFn: fetchPage,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    maxPages: 5, // keeps memory and refetch cost bounded
})
```
