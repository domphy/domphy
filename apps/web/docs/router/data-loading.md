# Data Loading

Every route can declare a `loader`. The router runs loaders for all matched routes in parallel during navigation, caches the results with a stale-while-revalidate model, and exposes them on each match as `loaderData`.

## Loaders

```ts
const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts/$postId",
    loader: ({ params }) => fetchPost(params.postId),
})
```

The loader context provides everything a fetch needs:

| Field | Meaning |
|---|---|
| `params` | Typed path params |
| `deps` | The result of `loaderDeps` (see below) |
| `context` | Router + route context |
| `location` | The destination `ParsedLocation` |
| `abortController` | Aborted when the navigation is superseded — pass `.signal` to `fetch` |
| `preload` | `true` when running as a preload |
| `cause` | `"enter"`, `"stay"`, or `"preload"` |
| `route` | The route instance |

In the UI, read the result from the match — and drive pending UI from `match.status`:

```ts
const match = matches.get(l).find((m) => m.routeId === postRoute.id)
if (!match || match.status === "pending") return [{ p: "Loading..." }]
if (match.status === "error") return [{ p: `Failed: ${match.error}` }]
return [{ h1: match.loaderData.title }]
```

## `loaderDeps`

Loaders are cached per path — search params are deliberately not part of the key unless you opt them in. `loaderDeps` picks which search params (or anything else) the loader depends on; changing deps re-runs the loader and creates a separate cache entry:

```ts
const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts",
    validateSearch: (search: Record<string, unknown>) => ({
        page: Number(search.page ?? 1),
    }),
    loaderDeps: ({ search }) => ({ page: search.page }),
    loader: ({ deps, abortController }) =>
        fetch(`/api/posts?page=${deps.page}`, { signal: abortController.signal })
            .then((response) => response.json()),
})
```

## Caching: `staleTime` And Preloading

Loader results follow the same two-timer model as [`@domphy/query`](../query/caching):

- **`staleTime`** (default `0`) — how long loader data is fresh. Navigating back to a route with fresh data uses the cache and skips the loader entirely; stale data is shown immediately while the loader re-runs.
- **`gcTime`** (default 30 minutes) — how long unmatched route data stays cached.

Set them per route or router-wide:

```ts
const router = createRouter({
    routeTree,
    history,
    defaultStaleTime: 10_000,
    defaultPreloadStaleTime: 30_000,
})

const postRoute = createRoute({
    // ...
    staleTime: 60_000,
    shouldReload: false, // never reload after first successful load (until invalidated)
})
```

Preload a route before the user commits — the classic hover pattern:

```ts
const link = (to: string, label: string): DomphyElement<"a"> => ({
    a: label,
    href: router.buildLocation({ to }).href,
    onClick: (e) => {
        e.preventDefault()
        router.navigate({ to })
    },
    onMouseEnter: () => router.preloadRoute({ to }),
})
```

Preloaded data lands in the same cache, so the subsequent navigation is instant. After a mutation, mark everything stale and re-run active loaders:

```ts
await router.invalidate()
```

## `redirect()`

Throw a redirect from `beforeLoad` or `loader` to send the user elsewhere — the canonical auth guard:

```ts
import { redirect } from "@domphy/router"

const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/dashboard",
    beforeLoad: ({ context, location }) => {
        if (!context.user) {
            throw redirect({
                to: "/login",
                search: { redirect: location.href },
            })
        }
    },
})
```

`redirect` accepts all navigate options plus `href` (absolute URLs trigger a full document navigation) and `statusCode` (default `307`, used by SSR). `beforeLoad` runs root → leaf *before* loaders, making it the right place for guards.

## `notFound()`

Throw from a loader when the data does not exist:

```ts
import { notFound } from "@domphy/router"

loader: async ({ params }) => {
    const post = await fetchPost(params.postId)
    if (!post) throw notFound()
    return post
},
```

The match ends with `status: "notFound"` — render your 404 UI from that:

```ts
if (match.status === "notFound") return [{ h1: "Post not found" }]
```

## Deferred Data

Return critical data immediately and let slow data stream in afterwards. Wrap the slow promise with `defer()` and return it *unawaited* — the navigation resolves as soon as the fast data is ready:

```ts
import { defer } from "@domphy/router"

const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts/$postId",
    loader: async ({ params }) => ({
        post: await fetchPost(params.postId),              // awaited — blocks navigation
        comments: defer(fetchComments(params.postId)),     // not awaited — streams in
    }),
})
```

There is no `<Await>` component in Domphy — async is a state problem, so bridge the deferred promise into a state:

```ts
const comments = toState<Array<Comment> | null>(null)

router.subscribe("onResolved", () => {
    const match = router.state.matches.find((m) => m.routeId === postRoute.id)
    comments.set(null)
    match?.loaderData?.comments.then((data: Array<Comment>) => comments.set(data))
})
```

```ts
const CommentList: DomphyElement<"section"> = {
    section: (l) => {
        const list = comments.get(l)
        if (!list) return [{ p: "Loading comments..." }]
        return list.map((comment) => ({ p: comment.text, _key: comment.id }))
    },
}
```

::: tip
A deferred promise also carries synchronous state: `promise[TSR_DEFERRED_PROMISE]` is `{ status: "pending" | "success" | "error", data?, error? }` — useful when you need to read progress without awaiting.
:::
