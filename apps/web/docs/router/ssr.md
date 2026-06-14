# SSR

The router is isomorphic: route matching, loaders, and redirects run identically on the server. The SSR layer is ported 1-1 from upstream and works at the router level — but the upstream streaming pipeline is designed around framework render integrations, so **wiring it to Domphy is manual**. This page shows the honest, minimal path.

## Entry Points

```ts
import { createRequestHandler, attachRouterServerSsrUtils } from "@domphy/router/ssr/server"
import { hydrate, json, mergeHeaders } from "@domphy/router/ssr/client"
```

- `@domphy/router/ssr/server` — `createRequestHandler`, `attachRouterServerSsrUtils` (dehydration + streaming utilities), `transformStreamWithRouter` and friends
- `@domphy/router/ssr/client` — `hydrate` for restoring dehydrated router state, plus `json` / `mergeHeaders` helpers

## The Minimal Pattern

The simplest reliable approach skips the streaming pipeline: run the router per request, render with Domphy SSR, and serialize what you need yourself.

Server — one router per request, memory history at the request URL:

```ts
import { createRouter, createMemoryHistory } from "@domphy/router"
import { ElementNode } from "@domphy/core"

async function renderPage(requestUrl: string) {
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [requestUrl] }),
    })

    await router.load() // matches + loaders, server-side

    if (router.state.redirect) {
        return { redirect: router.state.redirect.options.href, status: 307 }
    }

    syncRouterState() // seed the bridge states so generateHTML sees the data

    const node = new ElementNode(App)
    const html = node.generateHTML()
    const css = node.generateCSS()

    const loaderData = router.state.matches.map((match) => ({
        id: match.id,
        loaderData: match.loaderData,
    }))

    return {
        status: router.state.statusCode, // 200, or 404 when a match was notFound
        body: `<!doctype html>
<html>
<head><style id="domphy-style">${css}</style></head>
<body>
    <div id="app">${html}</div>
    <script>window.__ROUTER_STATE__ = ${JSON.stringify(loaderData)}</script>
    <script type="module" src="/client.js"></script>
</body>
</html>`,
    }
}
```

Client — same route tree, browser history, mount instead of render:

```ts
import { createRouter, createBrowserHistory } from "@domphy/router"
import { ElementNode } from "@domphy/core"

const router = createRouter({ routeTree, history: createBrowserHistory() })

// Optional: seed match data from the server so loaders with staleTime skip refetching
hydrateLoaderData(window.__ROUTER_STATE__)

await router.load()
syncRouterState()

const domStyle = document.getElementById("domphy-style") as HTMLStyleElement
new ElementNode(App).mount(document.getElementById("app")!, domStyle)
```

Create the router **per request** on the server — a module-level router would leak state between users.

## Dehydrate / Hydrate Concept

The ported upstream layer can do this serialization for you: on the server, `attachRouterServerSsrUtils(router, ...)` collects matches, loader data, and deferred promises into a dehydrated payload (serialized with `seroval`, so it handles promises and streaming); on the client, `hydrate(router)` from `@domphy/router/ssr/client` restores it before the first `router.load()`, so loaders do not re-run for data the server already fetched. `createRequestHandler` wraps the whole request lifecycle (including redirect responses).

These utilities work, but they assume a streaming HTML render to interleave with — Domphy's `generateHTML` is synchronous, so until a dedicated integration exists, the manual pattern above is the recommended route. The full upstream behavior is documented in the [TanStack Router SSR guide](https://tanstack.com/router/latest/docs/framework/react/guide/ssr).

## Scroll Restoration

On the client, enable scroll restoration once after creating the router:

```ts
import { setupScrollRestoration } from "@domphy/router"

const router = createRouter({ routeTree, history: createBrowserHistory(), scrollRestoration: true })
setupScrollRestoration(router)
```

For SSR pages, `@domphy/router/scroll-restoration-script` exports `getScrollRestorationScriptForRouter(router)` — an inline script to embed in the server HTML `<head>` so the scroll position is restored *before* hydration, avoiding a visible jump. (The export resolves to a no-op stub in browser builds.)
