# SSR & Hydration

Queries fit Domphy's SSR model directly: fetch on the server, serialize the cache, render HTML with the data already in state, then hydrate the cache on the client so the first `QueryObserver` subscription finds fresh data instead of refetching.

## Server

Prefetch into a request-scoped `QueryClient`, then dehydrate:

```ts
import { QueryClient, dehydrate } from "@domphy/query"
import { ElementNode } from "@domphy/core"

async function renderPage() {
    const queryClient = new QueryClient()

    await queryClient.prefetchQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    })

    const dehydratedState = dehydrate(queryClient)

    // Seed the bridge states from the cache so generateHTML sees the data
    users.set(queryClient.getQueryData(["users"]) ?? [])
    loading.set(false)

    const node = new ElementNode(App)
    const html = node.generateHTML()
    const css = node.generateCSS()

    queryClient.clear() // request-scoped — do not share between requests

    return `<!doctype html>
<html>
<head><style id="domphy-style">${css}</style></head>
<body>
    <div id="app">${html}</div>
    <script>window.__QUERY_STATE__ = ${JSON.stringify(dehydratedState)}</script>
    <script type="module" src="/client.js"></script>
</body>
</html>`
}
```

Create one `QueryClient` **per request**. A module-level client on the server would leak data between users.

## Client

Hydrate before mounting:

```ts
import { QueryClient, hydrate, QueryObserver } from "@domphy/query"
import { ElementNode } from "@domphy/core"

const queryClient = new QueryClient()
hydrate(queryClient, window.__QUERY_STATE__)
queryClient.mount()

const observer = new QueryObserver(queryClient, {
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 60_000, // treat server data as fresh — no immediate refetch
})

observer.subscribe((result) => {
    users.set(result.data ?? [])
    loading.set(result.isPending)
})

const domStyle = document.getElementById("domphy-style") as HTMLStyleElement
new ElementNode(App).mount(document.getElementById("app")!, domStyle)
```

Because the cache already holds the server data, the observer's first result is `success` with data — no flash, no duplicate request. Set `staleTime` high enough that the just-fetched server data is not immediately refetched.

## What Gets Dehydrated

By default `dehydrate` includes successful and pending queries, and skips mutations. Both are configurable:

```ts
dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => query.state.status === "success",
    shouldDehydrateMutation: () => false,
})
```

The dehydrated state is plain JSON-serializable data (`DehydratedState`) — embed it in HTML, send it over the wire, or store it.
