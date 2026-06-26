---
title: "Query Invalidation"
description: "Invalidate and refetch queries by key, exact match, or predicate — understand the stale/invalidation lifecycle."
---

# Query Invalidation

## What is invalidation?

Marking a query as "invalid" tells `@domphy/query` that the cached data is stale and should be refetched the next time it is observed. Invalidated queries refetch immediately if they have active subscribers; otherwise they refetch lazily on next mount.

## `invalidateQueries`

The main API — invalidates matching queries:

```ts
import { QueryClient } from "@domphy/query"

const queryClient = new QueryClient()

// Invalidate ALL queries with the "posts" prefix
await queryClient.invalidateQueries({ queryKey: ["posts"] })
```

This fuzzy-matches by default — `["posts"]` invalidates `["posts"]`, `["posts", 1]`, `["posts", "list"]`, etc.

## Exact match

Only invalidate a specific key:

```ts
// Invalidate ONLY ["posts", 1] — not ["posts"] or ["posts", 2]
await queryClient.invalidateQueries({
  queryKey: ["posts", 1],
  exact: true,
})
```

## Invalidate after mutation

The most common pattern — after a write, invalidate the affected queries:

```ts
import { createMutation } from "@domphy/query/domphy"

const createPost = createMutation(queryClient, {
  mutationFn: (data: PostInput) => api.post("/posts", data),
  onSuccess: async () => {
    // Invalidate the list — it will refetch with the new post included
    await queryClient.invalidateQueries({ queryKey: ["posts"] })
  },
})

const updatePost = createMutation(queryClient, {
  mutationFn: ({ id, data }: { id: number; data: Partial<Post> }) => api.patch(`/posts/${id}`, data),
  onSuccess: (_result, variables) => {
    // Invalidate the specific post AND the list
    queryClient.invalidateQueries({ queryKey: ["posts", variables.id] })
    queryClient.invalidateQueries({ queryKey: ["posts"] })
  },
})
```

## Predicate-based invalidation

For complex matching logic, use a `predicate` function:

```ts
// Invalidate all post-related queries for a specific author
await queryClient.invalidateQueries({
  predicate: (query) => {
    const key = query.queryKey as string[]
    return key[0] === "posts" && key.includes(authorId)
  },
})

// Invalidate all queries that have an active observer and are older than 1 minute
await queryClient.invalidateQueries({
  predicate: (query) => {
    const age = Date.now() - (query.state.dataUpdatedAt ?? 0)
    return age > 60_000 && query.getObserversCount() > 0
  },
})
```

## `refetchType`

Control what happens to invalidated queries:

```ts
await queryClient.invalidateQueries({
  queryKey: ["posts"],
  refetchType: "active",   // only refetch queries with active observers (default)
})

await queryClient.invalidateQueries({
  queryKey: ["posts"],
  refetchType: "all",      // refetch even inactive (background) queries
})

await queryClient.invalidateQueries({
  queryKey: ["posts"],
  refetchType: "none",     // mark stale but don't refetch (refetch on next mount)
})
```

## Optimistic updates + invalidation

Combine optimistic cache updates with post-mutation invalidation for smooth UX:

```ts
interface Todo { id: string; text: string; done: boolean }

const toggleTodo = createMutation(queryClient, {
  mutationFn: (id: string) => api.patch(`/todos/${id}/toggle`),

  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] })
    const previous = queryClient.getQueryData<Todo[]>(["todos"])

    // Optimistic update
    queryClient.setQueryData<Todo[]>(["todos"], (todos = []) =>
      todos.map((t) => t.id === id ? { ...t, done: !t.done } : t)
    )

    return { previous }
  },

  onError: (_err, _id, context) => {
    queryClient.setQueryData(["todos"], context?.previous)
  },

  onSettled: () => {
    // Final source-of-truth sync regardless of success/failure
    queryClient.invalidateQueries({ queryKey: ["todos"] })
  },
})
```

## `removeQueries`

Remove a query from the cache entirely (vs. just marking it stale):

```ts
// Remove when user logs out
function logout() {
  // Remove all private data from the cache
  queryClient.removeQueries({ queryKey: ["user"] })
  queryClient.removeQueries({ queryKey: ["notifications"] })
  queryClient.removeQueries({ queryKey: ["orders"] })
}
```

## `resetQueries`

Reset a query back to its initial state (removes data, sets status to "pending"):

```ts
// Reset a form query when the user clicks "clear"
queryClient.resetQueries({ queryKey: ["draft", formId] })
```

## `refetchQueries`

Force a refetch without marking as invalid first:

```ts
// Pull-to-refresh
async function onPullToRefresh() {
  await queryClient.refetchQueries({
    queryKey: ["feed"],
    type: "active",
  })
}
```

## Tracking invalidations reactively

Listen for cache events to react to invalidations:

```ts
import { toState } from "@domphy/core"

const isRefreshing = toState(false)

queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === "updated" && event.action.type === "fetch") {
    isRefreshing.set(queryClient.isFetching() > 0)
  }
})
```
