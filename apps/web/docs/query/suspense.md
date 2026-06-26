---
title: "Suspense & Streaming"
description: "Use Suspense-style loading states, throwOnError, and streaming SSR with @domphy/query."
---

# Suspense & Streaming

## Suspense-like patterns in Domphy

Domphy doesn't use React Suspense, but the same pattern — "show a fallback while loading, render when ready" — works with reactive state.

The simplest approach uses `_onError` as an error boundary and conditional rendering for the pending state:

```ts
import { QueryClient } from "@domphy/query"
import { createQuery } from "@domphy/query/domphy"

const queryClient = new QueryClient()

const user = createQuery(queryClient, {
  queryKey: () => ["user"],
  queryFn: fetchUser,
})

const UserPage = {
  div: (l) => {
    if (user.isPending(l)) return { div: "Loading…" }
    if (user.isError(l))   return { div: "Error loading user" }
    return UserContent
  },
}
```

## `throwOnError` — propagate errors up

When `throwOnError: true`, a query error is thrown into the Domphy element tree. The nearest ancestor with `_onError` catches it:

```ts
const queryClient = new QueryClient()

const user = createQuery(queryClient, {
  queryKey: () => ["user"],
  queryFn: fetchUser,
  throwOnError: true,   // throw errors into the element tree
})

const ErrorBoundary = {
  div: UserSection,
  _onError: (error, reset) => ({
    div: [
      { p: `Error: ${error.message}` },
      { button: "Retry", onClick: reset },
    ],
  }),
}
```

This mirrors React's `Suspense` + `ErrorBoundary` pattern but without React.

## Controlled pending with `suspense` flag

Use `suspense: true` to make the query participate in a Domphy-managed pending state. The component pauses rendering until the query resolves:

```ts
const queryClient = new QueryClient()

const post = createQuery(queryClient, {
  queryKey: () => ["post", postId],
  queryFn: () => fetchPost(postId),
  suspense: true,
})

// With suspense: true, post.data(l) is always defined — no undefined check needed
const PostContent = {
  article: [
    { h1: (l) => post.data(l)!.title },
    { p: (l) => post.data(l)!.body },
  ],
}
```

The parent wraps this with a pending boundary:

```ts
import { pending } from "@domphy/ui"

const PostPage = {
  div: PostContent,
  $: [pending({ fallback: { div: "Loading post…" } })],
}
```

## Deferred / background data

Separate critical data from non-critical data — render the page with placeholder content for slow queries:

```ts
const queryClient = new QueryClient()

const criticalData = createQuery(queryClient, {
  queryKey: () => ["page", id],
  queryFn: () => fetchPage(id),
})

const slowStats = createQuery(queryClient, {
  queryKey: () => ["stats", id],
  queryFn: () => fetchStats(id),
  // Stats can be deferred — render a placeholder and update when ready
})

const Page = {
  div: [
    // Critical content — shown immediately (with skeleton while loading)
    {
      article: (l) => criticalData.isPending(l) ? SkeletonArticle : Article(criticalData.data(l)!),
    },
    // Stats — deferred, shows loading indicator independently
    {
      aside: (l) => slowStats.isPending(l) ? { div: "Loading stats…" } : Stats(slowStats.data(l)!),
    },
  ],
}
```

## SSR streaming

With `@domphy/app`'s SSR mode, queries can stream their data progressively. The server renders the page shell immediately, then flushes query results as they resolve:

```ts
import { QueryClient, dehydrate, HydrationBoundary } from "@domphy/query"

// Server-side route loader
export async function loader({ params }) {
  const queryClient = new QueryClient()

  // Critical data — await before sending first byte
  await queryClient.prefetchQuery({
    queryKey: ["post", params.id],
    queryFn: () => fetchPost(params.id),
  })

  // Non-critical data — prefetch but don't block
  queryClient.prefetchQuery({
    queryKey: ["related", params.id],
    queryFn: () => fetchRelated(params.id),
  })

  return {
    dehydratedState: dehydrate(queryClient),
  }
}

// Client-side — hydrate from server state
const PostPage = {
  div: PostContent,
  $: [HydrationBoundary({ state: loaderData.dehydratedState })],
}
```

## Waterfall prevention

Avoid query waterfalls (query 1 loads → query 2 starts → query 3 starts) by prefetching all queries for a page in the loader:

```ts
// Instead of:
// Component A mounts → starts query A
// Component B (in A) mounts → starts query B (after A resolves)

// Do this:
async function prefetchAll(client: QueryClient, params: PageParams) {
  await Promise.all([
    client.prefetchQuery({ queryKey: ["user"], queryFn: fetchUser }),
    client.prefetchQuery({ queryKey: ["posts", params.userId], queryFn: () => fetchPosts(params.userId) }),
    client.prefetchQuery({ queryKey: ["settings"], queryFn: fetchSettings }),
  ])
}
```

All queries start simultaneously — no waterfall.

## `useIsFetching` — global loading indicator

Show a top-level loading bar when any query is in-flight:

```ts
import { useIsFetching } from "@domphy/query/domphy"

const isFetching = useIsFetching()

const LoadingBar = {
  div: null,
  hidden: (l) => isFetching(l) === 0,
  style: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: "2px",
    background: "var(--primary-5)",
    animation: "indeterminate 1s linear infinite",
  },
}
```

`useIsFetching()` returns the count of in-flight queries — `0` when nothing is loading.
