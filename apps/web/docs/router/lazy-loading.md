---
title: "Code Splitting & Lazy Loading"
description: "Lazy-load route components, preload on hover, split vendor chunks, and reduce initial bundle size."
---

# Code Splitting & Lazy Loading

## Lazy route component

Split each route's component into its own chunk with a dynamic `import()`. Pass `component` as an async factory:

```ts
import { createRoute } from "@domphy/router"

export const DashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: async () => {
    const { Dashboard } = await import("./pages/Dashboard.js")
    return Dashboard
  },
})
```

The router resolves the component before rendering — users see the pending UI while the chunk loads.

## Pending UI during load

Show a loading state while a lazy component fetches:

```ts
export const DashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: async () => {
    const { Dashboard } = await import("./pages/Dashboard.js")
    return Dashboard
  },
  pendingComponent: () => ({ div: "Loading dashboard…" }),
  pendingMinMs: 200,    // don't flash the pending UI for fast loads
})
```

`pendingMinMs` (default `0`) sets a minimum display time — prevents a flash when the chunk is already cached.

## Preloading on hover

Preload a route's chunk before the user clicks — reduces perceived latency:

```ts
const NavLink = (to: string, label: string) => ({
  a: label,
  href: router.buildLocation({ to }).href,
  onMouseenter: () => router.preloadRoute({ to }),   // fires on hover
  onClick: (e: MouseEvent) => { e.preventDefault(); router.navigate({ to }) },
})
```

`router.preloadRoute` resolves the component and loader concurrently. Subsequent navigation uses the cached result instantly.

## Lazy loader

Loaders can also be lazy. Combine with the component for a single chunk:

```ts
export const SettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  loader: async () => {
    const { loadSettings } = await import("./loaders/settings.js")
    return loadSettings()
  },
  component: async () => {
    const { SettingsPage } = await import("./pages/Settings.js")
    return SettingsPage
  },
})
```

## Chunk grouping with Vite

Group related routes into a single chunk to reduce round-trips:

```ts
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "admin": [
            "./src/pages/Admin.ts",
            "./src/pages/Users.ts",
            "./src/pages/Roles.ts",
          ],
        },
      },
    },
  },
}
```

Then import from the same chunk:

```ts
const AdminRoute = createRoute({
  path: "/admin",
  component: async () => {
    const { Admin } = await import("./pages/Admin.js")   // triggers "admin" chunk load
    return Admin
  },
})
```

## Route-level error handling

Catch chunk load failures (network errors, cache invalidation):

```ts
const LazyRoute = createRoute({
  path: "/reports",
  component: async () => {
    try {
      const { Reports } = await import("./pages/Reports.js")
      return Reports
    } catch {
      const { ErrorPage } = await import("./pages/ErrorPage.js")
      return () => ErrorPage({ message: "Failed to load this page." })
    }
  },
  errorComponent: ({ error }) => ({
    div: `Error: ${error.message}`,
  }),
})
```

## Preload intent

Use `router.preloadRoute()` with `intent: "hover"` | `"render"` to control when routes start loading:

```ts
// Preload on idle after initial render — good for "next likely page"
requestIdleCallback(() => {
  router.preloadRoute({ to: "/dashboard" })
})
```

## Critical path vs async chunks

Keep the initial bundle lean by marking non-critical imports as lazy:

```ts
// BEFORE — entire charting library in initial bundle
import { Chart } from "chart.js"

// AFTER — loaded only when the analytics page is actually visited
const AnalyticsRoute = createRoute({
  path: "/analytics",
  component: async () => {
    await import("chart.js")                         // side-effect import
    const { Analytics } = await import("./Analytics.js")
    return Analytics
  },
})
```

## Bundle analysis

After `vite build`, inspect chunk sizes:

```bash
vite build --mode analyze
npx vite-bundle-analyzer dist/stats.html
```

Aim for:
- Initial bundle (router + core + theme): < 30 kB gzip
- Per-route chunks: < 10 kB gzip for simple pages, < 50 kB for heavy ones
