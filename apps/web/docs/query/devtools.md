---
title: "Devtools"
description: "Inspect query cache, monitor requests, and debug stale/fetching state with the @domphy/query devtools panel."
---

# Devtools

The `@domphy/query` devtools panel lets you inspect every query and mutation in your app: their keys, state (`pending`/`success`/`error`), staleness, `dataUpdatedAt`, and the cached data.

## Installation

The devtools panel is separate from `@domphy/query` — install it independently:

```bash
pnpm add @domphy/query-devtools
```

Or use the peer-installed version via `@domphy/query`:

```ts
import { QueryDevtools } from "@domphy/query/devtools"
```

## Mounting the devtools

Attach the devtools to your app as a Domphy element — it appears as a floating panel:

```ts
import { QueryClient } from "@domphy/query"
import { QueryDevtools } from "@domphy/query/devtools"

const client = new QueryClient()

const App = {
  div: [
    MainContent,
    // Floating devtools panel — only in development
    ...(import.meta.env.DEV ? [{ div: null, $: [QueryDevtools({ client })] }] : []),
  ],
}
```

Or using the `devtools()` patch which handles the dev/prod toggle automatically:

```ts
import { devtools } from "@domphy/query/devtools"

const App = {
  div: [
    MainContent,
    {
      div: null,
      $: [devtools({ client, initialIsOpen: false })],
    },
  ],
}
```

## Configuration

```ts
QueryDevtools({
  client,              // required — QueryClient instance
  initialIsOpen: false,   // start collapsed (default: false)
  position: "bottom-right",  // "top-left" | "top-right" | "bottom-left" | "bottom-right"
  panelProps: {        // props for the panel container
    style: { height: "500px" },
  },
  closeButtonProps: {  // props for the close button
    "aria-label": "Close query devtools",
  },
  toggleButtonProps: { // props for the toggle (floating) button
    style: { marginBottom: "40px" },
  },
  errorTypes: [
    // Register custom error types for better display
    { name: "ApiError", initializer: (q) => new Error(`${q.queryKey} failed`) },
  ],
})
```

## What the devtools show

The panel has two sections:

**Query list** — all active queries sorted by most recently updated:
- Query key (nested JSON)
- Status badge: `fresh` (green), `stale` (yellow), `fetching` (blue), `paused` (gray), `inactive` (dim)
- Observer count — how many components are subscribed
- Click any query to expand its details

**Query detail pane** (when a query is selected):
- Full query key
- Status + `dataUpdatedAt`
- Stale time config
- Refetch count
- Raw `data` (JSON tree viewer)
- Raw `error` (if errored)
- Action buttons: **Refetch**, **Invalidate**, **Reset**, **Remove**

## Using devtools in tests

In integration tests, you can inspect query state programmatically without the visual panel:

```ts
import { QueryClient } from "@domphy/query"

const client = new QueryClient()

// After your async operations:
const queryState = client.getQueryState(["user", "123"])
console.log(queryState?.status)          // "success"
console.log(queryState?.dataUpdatedAt)   // timestamp
console.log(queryState?.data)            // cached data

// List all active queries:
const queries = client.getQueryCache().getAll()
queries.forEach(q => {
  console.log(q.queryKey, q.state.status, q.state.data)
})
```

## Debugging stale data

If a query shows data but it's not refreshing, check:

1. **`staleTime`** — set to `Infinity`? Check with devtools: `Status: fresh`
2. **`enabled: false`** — query is disabled, won't refetch
3. **No observers** — no component is subscribed; GC may have cleared it
4. **Network tab** — is the request being made but returning cached data?

Force a refetch from devtools by clicking **Invalidate** on the query in the panel, or programmatically:

```ts
await client.invalidateQueries({ queryKey: ["user"] })
```

## Bundle size

The devtools add ~60kb to your bundle. Always conditionally import:

```ts
// Vite tree-shakes this correctly
if (import.meta.env.DEV) {
  const { QueryDevtools } = await import("@domphy/query/devtools")
  mountDevtools(QueryDevtools({ client }))
}
```
