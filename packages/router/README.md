# @domphy/router

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/router/) · [npm](https://www.npmjs.com/package/@domphy/router)

Framework-agnostic, fully type-safe routing for Domphy apps: nested routes, path params, validated search params, loaders with caching, redirects, scroll restoration, and SSR streaming.


## Install

```bash
npm install @domphy/router
```

## Quick Example

```ts
import {
    createRouter,
    createRoute,
    createRootRoute,
    createBrowserHistory,
} from "@domphy/router"
import { toState } from "@domphy/core"

const rootRoute = createRootRoute()

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
})

const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts/$postId",
    loader: ({ params }) =>
        fetch(`/api/posts/${params.postId}`).then((response) => response.json()),
})

const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, postRoute]),
    history: createBrowserHistory(),
})

await router.load()
```

Bridge router state into Domphy reactivity with `toState`:

```ts
const matches = toState(router.state.matches)

router.subscribe("onResolved", () => {
    matches.set(router.state.matches)
})

const App = {
    div: (listener) => matches.get(listener).map((match) => ({
        section: JSON.stringify(match.loaderData),
        _key: match.id,
    })),
}
```

## What It Includes

- `createRouter` / `createRoute` / `createRootRoute` — nested route trees with full type inference
- Path params (`/posts/$postId`), wildcards, optional segments, route masking
- Validated search params with middleware (`retainSearchParams`, `stripSearchParams`)
- Loaders with built-in stale-while-revalidate caching, preloading, and deferred data
- `redirect` / `notFound` — control-flow primitives for loaders and navigation
- History layer included (browser, hash, and memory)
- Scroll restoration, view transitions, navigation blocking
- SSR entries (`@domphy/router/ssr/server`, `@domphy/router/ssr/client`) with streaming and hydration

## Documentation

- [Router docs](https://domphy.com/docs/router/)
