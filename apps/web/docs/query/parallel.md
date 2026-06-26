---
title: "Parallel & Dependent Queries"
description: "Run multiple queries concurrently, chain dependent queries, and combine results."
---

# Parallel & Dependent Queries

## Parallel queries

Run multiple independent queries simultaneously — all start at the same time:

```ts
import { createQuery } from "@domphy/query/domphy"

// These two queries fire in parallel
const user    = createQuery({ queryKey: () => ["user", userId],  queryFn: () => fetchUser(userId) })
const profile = createQuery({ queryKey: () => ["profile", userId], queryFn: () => fetchProfile(userId) })

const Dashboard = {
  div: (l) => {
    const u = user.data(l)
    const p = profile.data(l)
    if (user.isPending(l) || profile.isPending(l)) return { div: "Loading…" }
    return {
      div: [
        { h1: u?.name ?? "" },
        { p: p?.bio ?? "" },
      ],
    }
  },
}
```

## `createQueries` — dynamic parallel queries

When the number of queries is dynamic (e.g. one query per item in a list):

```ts
import { createQueries } from "@domphy/query/domphy"

const repoIds = toState<string[]>(["react", "vue", "svelte"])

// Creates one query per repo id — automatically added/removed as ids change
const repoQueries = createQueries((l) =>
  repoIds.get(l).map((id) => ({
    queryKey: ["repo", id],
    queryFn: () => fetchRepo(id),
  }))
)

const RepoList = {
  ul: (l) => repoQueries(l).map((q, i) => ({
    _key: i,
    li: q.isPending ? "Loading…" : q.data?.fullName ?? "",
  })),
}
```

`createQueries` takes a reactive function returning a query array. Queries are keyed by position — the count can change reactively.

## Dependent queries

A query that depends on another query's result. Use `enabled` to prevent firing until the prerequisite resolves:

```ts
const user = createQuery({
  queryKey: () => ["user"],
  queryFn: fetchCurrentUser,
})

const permissions = createQuery({
  queryKey: () => ["permissions", user.data()?.id],
  queryFn: () => fetchPermissions(user.data()!.id),
  enabled: () => !!user.data()?.id,   // only runs when user.data().id exists
})
```

When `enabled` is `false`:
- `isPending` = `true`
- `isFetching` = `false`
- `status` = `"pending"`

Chain three or more queries:

```ts
const org = createQuery({ queryKey: () => ["org"], queryFn: fetchOrg })

const teams = createQuery({
  queryKey: () => ["teams", org.data()?.id],
  queryFn: () => fetchTeams(org.data()!.id),
  enabled: () => !!org.data()?.id,
})

const members = createQuery({
  queryKey: () => ["members", teams.data()?.[0]?.id],
  queryFn: () => fetchMembers(teams.data()![0].id),
  enabled: () => !!teams.data()?.[0]?.id,
})
```

## Combining results

Aggregate results from multiple queries:

```ts
const users   = createQuery({ queryKey: () => ["users"],   queryFn: fetchUsers })
const groups  = createQuery({ queryKey: () => ["groups"],  queryFn: fetchGroups })
const settings = createQuery({ queryKey: () => ["settings"], queryFn: fetchSettings })

const isAllLoaded = computed((l) =>
  !users.isPending(l) && !groups.isPending(l) && !settings.isPending(l)
)

const hasAnyError = computed((l) =>
  users.isError(l) || groups.isError(l) || settings.isError(l)
)

const Page = {
  div: (l) => {
    if (!isAllLoaded.get(l)) return { div: "Loading…" }
    if (hasAnyError.get(l))  return { div: "Error loading data" }
    return AppContent
  },
}
```

## Prefetching

Pre-load data before the user navigates to it:

```ts
import { useQueryClient } from "@domphy/query/domphy"

const client = useQueryClient()

// Prefetch on hover
const NavLink = {
  a: "Dashboard",
  href: "/dashboard",
  onMouseenter: () => {
    client.prefetchQuery({
      queryKey: ["dashboard"],
      queryFn: fetchDashboard,
      staleTime: 30_000,   // don't re-prefetch if fresh within 30s
    })
  },
}
```

Prefetched data goes into the cache — when the user navigates, the query is already warm and renders instantly.

## Background refetch indicators

Show a subtle indicator when data is being refreshed in the background (stale-while-revalidate):

```ts
const posts = createQuery({
  queryKey: () => ["posts"],
  queryFn: fetchPosts,
  staleTime: 30_000,   // fresh for 30 seconds
})

const PostList = {
  div: [
    // Background refetch indicator — subtle, not a full loading spinner
    {
      div: "↻ Refreshing…",
      hidden: (l) => !posts.isFetching(l) || posts.isPending(l),
      style: { fontSize: "0.75rem", opacity: 0.6 },
    },
    {
      ul: (l) => (posts.data(l) ?? []).map((p) => ({
        li: p.title,
        _key: p.id,
      })),
    },
  ],
}
```

`isFetching` is `true` during both the initial load AND background refreshes.
`isPending` is only `true` during the initial load (no data yet).

## Initial data

Seed a query's cache before it mounts — useful for data from SSR or a previous navigation:

```ts
const post = createQuery({
  queryKey: () => ["post", postId],
  queryFn: () => fetchPost(postId),
  initialData: () => client.getQueryData(["post", postId]),   // from cache if available
  initialDataUpdatedAt: () => client.getQueryState(["post", postId])?.dataUpdatedAt,
})
```

Or inject static data (marks as stale immediately so it refetches):

```ts
const config = createQuery({
  queryKey: () => ["config"],
  queryFn: fetchConfig,
  initialData: window.__INITIAL_CONFIG__,   // injected by server
  staleTime: 10_000,
})
```

## Placeholder data

Show placeholder content while the real data loads (no loading spinner needed):

```ts
const post = createQuery({
  queryKey: () => ["post", postId],
  queryFn: () => fetchPost(postId),
  placeholderData: {
    id: postId,
    title: "Loading…",
    body: "",
  },
})

// post.data() is always defined (placeholder or real)
const PostView = {
  article: [
    { h1: (l) => post.data(l)?.title ?? "" },
    { p: (l) => post.data(l)?.body ?? "" },
  ],
}
```

## Keeping previous data during pagination

Prevent blank states when paginating — keep the current page visible while the next page loads:

```ts
import { keepPreviousData } from "@domphy/query"

const page = toState(1)

const posts = createQuery({
  queryKey: () => ["posts", page.get()],
  queryFn: () => fetchPage(page.get()),
  placeholderData: keepPreviousData,   // shows page N while page N+1 loads
})
```

`posts.isPlaceholderData(l)` is `true` when showing the previous page's data.
