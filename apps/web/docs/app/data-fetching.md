# Data Fetching

## Loaders

Each segment may declare a `loader` — the equivalent of server-side data fetching in a Next.js segment. Loaders of all matched segments run in parallel on every navigation; results land in `context.data` of that segment's `page` and `layout`:

```ts
{
  path: "blog/[slug]",
  loader: async ({ params, searchParams }) => {
    const response = await fetch(`/api/posts/${params.slug}`)
    if (!response.ok) notFound()
    return response.json()
  },
  page: (context: RouteContext<Post>) => ({ h1: context.data.title }),
}
```

The `LoaderContext` carries `pathname`, `url`, `params`, `searchParams` and (on the server) `headers`.

### Reading ancestor data (SvelteKit `parent()` equivalent)

`context.segmentData` holds the resolved loader result of every matched segment, keyed by segment id (the full pattern path, e.g. `"/"`, `"/blog/[slug]"`). A nested page can reach its parent's data without passing it down manually:

```ts
// Root layout loader provides the session
const rootLoader: Loader<Session> = () => getSession()

// Nested page reads root data via segmentData
function DashboardPage(context: RouteContext<Dashboard>) {
  const session = context.segmentData["/"] as Session
  return { h1: `Hello ${session.user.name}` }
}
```

The segment id for a route group is the pattern including the group prefix, e.g. `"/(admin)"`. Use `router.getMatch()?.route.chainIds` to inspect the ids for a live match.

## Caching with revalidate

`revalidate` is the ISR-style cache lifetime in seconds:

```ts
{
  path: "products",
  loader: fetchProducts,
  revalidate: 60,        // cached for 60s, then re-fetched
  page: ProductsPage,
}
```

- `undefined` (default) — re-run on every navigation, like `cache: "no-store"`
- `revalidate: 60` — serve the cached result for 60 seconds
- `revalidate: Infinity` — cache forever, like `force-cache`

`router.refresh()` clears the cache and re-runs everything for the current URL.

### Stale-while-revalidate

When a cached entry ages past its `revalidate` window, the next navigation **serves the stale value immediately** and refetches in the background — the same model as Next.js ISR. There is no loading flash: the page renders instantly with the old data, then re-renders in place once the fresh value lands.

```ts
{
  path: "dashboard",
  loader: fetchStats,
  revalidate: 30,   // after 30s: show stale, refetch, swap in fresh
  page: StatsPage,
}
```

The background refetch starts after the current render commits, so a stale entry never blocks navigation. If the user has already moved to another route by the time it resolves, the re-render is skipped. A failed background refetch keeps the stale entry and stays silent.

## Prefetching

`router.prefetch(href)` (and `navLink`'s hover/visible prefetch) runs the target's loaders ahead of navigation. Results stay usable for 30 seconds — the same window as the Next.js client router cache — so the navigation itself renders instantly without re-fetching, even for uncached loaders.

## Control Flow from Loaders

Loaders can interrupt rendering with the `next/navigation` functions:

```ts
import { notFound, redirect, permanentRedirect } from "@domphy/app"

loader: async ({ params }) => {
  const session = await getSession()
  if (!session) redirect("/login")

  const post = await fetchPost(params.slug as string)
  if (!post) notFound()
  return post
}
```

`redirect()` restarts navigation at the target (history entry replaced); `notFound()` renders the nearest `notFound` boundary; errors render the nearest `error` boundary.

## Pairing with @domphy/query

Loaders cover route-level data. For cache-rich client data (background refetching, mutations, infinite queries), use [`@domphy/query`](/docs/query/) inside pages — the two compose freely: the loader provides the initial data, an observer keeps it fresh.
