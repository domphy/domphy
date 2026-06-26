<script setup lang="ts">

import RouterContext from "../demos/router/context.ts?raw"
</script>

# Route Trees

A route tree is built from plain function calls — no file conventions, no JSX. Every route declares its parent with `getParentRoute`, and the tree is assembled once with `addChildren`. This is what gives params, search params, context, and loader data their types.

## Building A Tree

```ts
import { createRootRoute, createRoute } from "@domphy/router"

const rootRoute = createRootRoute()

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
})

const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts",
})

const postRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "$postId",
})

const routeTree = rootRoute.addChildren([
    indexRoute,
    postsRoute.addChildren([postRoute]),
])
```

Child paths compose: `postRoute` matches `/posts/$postId`. Leading and trailing slashes are normalized, so `path: "$postId"` and `path: "/$postId"` are equivalent.

Every route gets a stable `id` (its full path, e.g. `"/posts/$postId"`) and a `fullPath`. The `id` is how you find a route's match in `router.state.matches`:

```ts
const match = router.state.matches.find((m) => m.routeId === postRoute.id)
```

## Path Params

Segments starting with `$` are params. They are available, typed, on the match and in every loader:

```ts
const postRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "$postId",
    loader: ({ params }) => fetchPost(params.postId), // params.postId: string
})

router.navigate({ to: "/posts/$postId", params: { postId: "42" } })
```

Params from parent routes are inherited — a route at `/users/$userId/posts/$postId` sees both `userId` and `postId`.

Optional params use braces with a dash, and prefix/suffix segments are supported:

```ts
path: "/posts/{-$category}"          // matches /posts and /posts/news
path: "/files/prefix{$name}.txt"     // matches /files/prefixreport.txt
```

## Wildcards

A trailing `$` matches everything after it. The remainder is exposed as `params._splat`:

```ts
const fileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/files/$",
    loader: ({ params }) => readFile(params._splat), // "docs/readme.md" for /files/docs/readme.md
})

router.navigate({ to: "/files/$", params: { _splat: "docs/readme.md" } })
```

## Layout Routes

A route with an `id` instead of a `path` is *pathless*: it adds no URL segment but still participates in matching — useful for shared layouts, shared `beforeLoad` guards, or shared context:

```ts
const authLayout = createRoute({
    getParentRoute: () => rootRoute,
    id: "auth",
    beforeLoad: () => {
        if (!isLoggedIn()) throw redirect({ to: "/login" })
    },
})

const dashboardRoute = createRoute({
    getParentRoute: () => authLayout,
    path: "/dashboard",
})

const routeTree = rootRoute.addChildren([
    authLayout.addChildren([dashboardRoute]),
])
```

`/dashboard` now matches three routes: root → `auth` → dashboard.

## Rendering Nested Matches

`router.state.matches` is ordered root → leaf, which maps directly to nested layouts. The Domphy pattern is a render map keyed by route id — each entry renders its own chrome and recurses into the rest of the matches:

```ts
import { type DomphyElement, toState } from "@domphy/core"
import type { AnyRouteMatch } from "@domphy/router"

const matches = toState<Array<AnyRouteMatch>>([])
router.subscribe("onResolved", () => matches.set(router.state.matches))

const renderers: Record<string, (match: AnyRouteMatch, rest: Array<AnyRouteMatch>) => DomphyElement> = {
    [postsRoute.id]: (match, rest) => ({
        section: [{ h2: "Posts" }, ...rest.map((m) => renderMatch(m, rest.slice(1)))],
    }),
    [postRoute.id]: (match) => ({
        article: match.status === "pending" ? "Loading..." : match.loaderData.title,
    }),
}

function renderMatch(match: AnyRouteMatch, rest: Array<AnyRouteMatch>): DomphyElement {
    const render = renderers[match.routeId]
    return render ? render(match, rest) : { div: rest.map((m) => renderMatch(m, rest.slice(1))) }
}

const App: DomphyElement<"main"> = {
    main: (l) => {
        const [, ...rest] = matches.get(l) // skip the root match
        return rest.length ? [renderMatch(rest[0], rest.slice(1))] : []
    },
}
```

For flat apps without shared layouts, finding the leaf match by `routeId` (as in the [Overview](./)) is all you need.

::: tip
Each match exposes `params`, `search`, `loaderData`, `context`, `status` (`"pending" | "success" | "error" | "redirected" | "notFound"`), and `error`. Drive pending and error UI from `match.status` exactly like you would from a query result.
:::

## Route Context

The root route can require a typed context, provided once at router creation and merged down the tree by `beforeLoad`:

```ts
import { createRootRouteWithContext, createRouter } from "@domphy/router"

type RouterContext = { user: User | null }

const rootRoute = createRootRouteWithContext<RouterContext>()()

const router = createRouter({
    routeTree,
    history,
    context: { user: null },
})
```

Every loader and `beforeLoad` then receives `context` — the standard place to pass API clients or session data without globals.

Call `router.update({ context: newContext })` when context values change at runtime (e.g. after login), then navigate to re-run `beforeLoad` guards.

<CodeEditor :code="RouterContext" />
