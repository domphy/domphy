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

A page can also read ancestor data through `context.segmentData`, keyed by segment id (e.g. `"/"`, `"/blog/[slug]"`).

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
