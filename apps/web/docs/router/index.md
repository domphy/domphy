<script setup lang="ts">

import Basic from "../demos/router/basic.ts?raw"
import Loader from "../demos/router/loader.ts?raw"
</script>

# Router

`@domphy/router` provides type-safe routing for Domphy apps: nested route trees, path params, validated search params, loaders with caching, redirects, navigation blocking, scroll restoration, and SSR.

Like the rest of Domphy, it is framework-agnostic — the bridge to the UI is plain `toState`. The history layer is included, so no separate install is needed.

## Install

```bash
npm install @domphy/router
```

## Live Examples

Basic navigation:

<CodeEditor :code="Basic" />

Route loaders:

<CodeEditor :code="Loader" />

## Core Concepts

- **Route tree** — built from `createRootRoute()` and `createRoute()`, composed with `addChildren`. Every route knows its parent via `getParentRoute`, which is what makes params, search, and loader data fully typed.
- **Router** — `createRouter({ routeTree, history })` owns matching, navigation, loading, and caching. `router.state` is the single source of truth.
- **Matches** — `router.state.matches` is the array of matched routes for the current location, ordered root → leaf. Each match carries `params`, `search`, `loaderData`, and `status`.
- **History** — `createBrowserHistory()`, `createHashHistory()`, or `createMemoryHistory()` decide how locations map to the URL (or to memory, for tests and SSR).

## The Bridge Pattern

Domphy has no router primitive by design — routing is a state problem, and state lives outside the UI. The router manages location and match state; `toState` pushes it into the UI:

```ts
import { type DomphyElement, toState } from "@domphy/core"
import {
    createRouter, createRoute, createRootRoute, createMemoryHistory,
    type AnyRouteMatch,
} from "@domphy/router"

const rootRoute = createRootRoute()
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" })
const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts/$postId",
    loader: ({ params }) => fetchPost(params.postId),
})
const routeTree = rootRoute.addChildren([indexRoute, postRoute])
const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ["/"] }) })

// Bridge: router state -> Domphy states
const matches = toState<Array<AnyRouteMatch>>([])
const pathname = toState("/")
function syncRouterState() {
    matches.set(router.state.matches)
    pathname.set(router.state.location.pathname)
}
router.subscribe("onResolved", syncRouterState)
await router.load()
syncRouterState()
```

The UI reads the states reactively — nothing router-specific leaks into elements:

```ts
const App: DomphyElement<"main"> = {
    main: (l) => {
        const match = matches.get(l).find((m) => m.routeId === postRoute.id)
        if (!match) return [{ p: "Welcome" }]
        return [{ h1: match.loaderData.title }, { p: match.loaderData.body }]
    },
}
```

## Links

Render real `<a>` elements with real hrefs, but intercept the click so navigation stays client-side:

```ts
const link = (to: string, label: string): DomphyElement<"a"> => ({
    a: label,
    href: router.buildLocation({ to }).href,
    onClick: (e) => {
        e.preventDefault()
        router.navigate({ to })
    },
})
```

See [Navigation](./navigation) for active links, history types, and blocking.

## What To Read Next

1. [Route Trees](./routes) for `createRoute`, path params, wildcards, and nested layouts
2. [Navigation](./navigation) for `navigate`, `buildLocation`, link patterns, and blocking
3. [Search Params](./search-params) for `validateSearch` and search middleware
4. [Data Loading](./data-loading) for loaders, caching, `redirect()`, and `notFound()`
5. [SSR](./ssr) for the server and client SSR entries
6. [API Reference](./api) for the full export list
