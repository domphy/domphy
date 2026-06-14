# API Reference

`@domphy/query` is a 1-1 port of `@tanstack/query-core` v5.90.20 — every export below has identical behavior to upstream, so the [TanStack Query reference](https://tanstack.com/query/latest/docs/reference/QueryClient) documents each item in full detail.

## Client And Caches

- `QueryClient` — the entry point. `fetchQuery`, `prefetchQuery`, `getQueryData`, `setQueryData`, `ensureQueryData`, `invalidateQueries`, `refetchQueries`, `cancelQueries`, `removeQueries`, `resetQueries`, `setQueryDefaults`, `setMutationDefaults`, `getQueryCache`, `getMutationCache`, `mount`, `unmount`, `clear`
- `QueryCache` — holds all `Query` instances. `find`, `findAll`, `subscribe`, `clear`
- `MutationCache` — holds all `Mutation` instances. `find`, `findAll`, `subscribe`, `clear`
- `Query` — one cache entry (advanced; usually accessed via `QueryCache`)
- `Mutation` — one mutation instance (advanced)

## Observers

- `QueryObserver` — subscribe to one query. `subscribe`, `setOptions`, `getCurrentResult`, `refetch`
- `QueriesObserver` — subscribe to a dynamic array of queries
- `InfiniteQueryObserver` — paginated queries. Adds `fetchNextPage`, `fetchPreviousPage`
- `MutationObserver` — run mutations. `mutate`, `reset`, `subscribe`, `getCurrentResult`

## Managers

- `focusManager` — window focus tracking; `setFocused`, `setEventListener`, `subscribe`
- `onlineManager` — online/offline tracking; `setOnline`, `setEventListener`, `subscribe`
- `notifyManager` — update batching; `batch`, `schedule`, `setScheduler`, plus `defaultScheduler`
- `timeoutManager` — pluggable timer provider (`TimeoutProvider`, `TimeoutCallback`, `ManagedTimerId`)

## Hydration

- `dehydrate(client, options?)` — serialize the cache to `DehydratedState`
- `hydrate(client, state, options?)` — restore a serialized cache
- `defaultShouldDehydrateQuery`, `defaultShouldDehydrateMutation` — the default include rules

## Utilities

- `hashKey(queryKey)` — structural hash, stable across object key order
- `matchQuery(filters, query)` / `matchMutation(filters, mutation)` — filter predicates
- `partialMatchKey(a, b)` — prefix key matching
- `replaceEqualDeep(a, b)` — structural sharing helper (keeps referential identity for unchanged parts)
- `keepPreviousData` — pass as `placeholderData` to keep data across key changes
- `skipToken` — pass as `queryFn` to disable a query type-safely
- `isCancelledError(error)` / `CancelledError` — cancellation detection
- `shouldThrowError`, `isServer`, `noop`
- `experimental_streamedQuery` — build a query from an `AsyncIterable` (streamed chunks)

## Types

All public types are re-exported, including:

- options: `QueryObserverOptions`, `InfiniteQueryObserverOptions`, `MutationObserverOptions`, `QueryOptions`, `FetchQueryOptions`, `DefaultOptions`
- results: `QueryObserverResult`, `InfiniteQueryObserverResult`, `MutationObserverResult`
- keys & functions: `QueryKey`, `QueryFunction`, `QueryFunctionContext`, `MutationFunction`
- state: `QueryState`, `MutationState`, `QueryStatus`, `FetchStatus`, `MutationStatus`
- data shapes: `InfiniteData`, `GetNextPageParamFunction`, `DehydratedState`
- filters: `QueryFilters`, `MutationFilters`, `SkipToken`, `Updater`
- cache events: `QueryCacheNotifyEvent`, `MutationCacheNotifyEvent`, `QueriesObserverOptions`

## CDN Global

The IIFE bundle exposes everything under `Domphy.query`:

```html
<script src="https://unpkg.com/@domphy/query/dist/query.global.js"></script>
<script>
    const { QueryClient, QueryObserver } = Domphy.query
</script>
```
