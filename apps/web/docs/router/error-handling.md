---
title: "Error Handling & Not Found"
description: "Route-level error components, not-found errors, error recovery, and fallback UIs."
---

# Error Handling & Not Found

## Route error component

Each route can define its own `errorComponent` — rendered when the route's loader throws:

```ts
import { createRoute } from "@domphy/router"

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$id",
  loader: async ({ params }) => {
    const post = await fetchPost(params.id)
    if (!post) throw new Error("Post not found")
    return post
  },
  component: () => PostPage,
  errorComponent: ({ error }) => ({
    div: [
      { h2: "Something went wrong" },
      { p: (error as Error).message },
      { button: "Go back", onClick: () => history.back() },
    ],
  }),
})
```

`errorComponent` receives `{ error: unknown; reset: () => void }`.

## Global error boundary

Set a global `defaultErrorComponent` on the router to catch all unhandled errors:

```ts
const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error, reset }) => ({
    div: [
      { h1: "Unexpected error" },
      { pre: (error as Error).message, style: { fontSize: "0.875rem" } },
      { button: "Try again", onClick: reset },
    ],
    style: { padding: "2rem", textAlign: "center" },
  }),
})
```

`reset` re-runs the failed route transition — useful after fixing a transient error.

## Not-found errors

When a resource doesn't exist (404-equivalent), throw `notFound()` from a loader instead of returning `null`:

```ts
import { createRoute, notFound } from "@domphy/router"

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$id",
  loader: async ({ params }) => {
    const user = await fetchUser(params.id)
    if (!user) throw notFound()   // ← renders notFoundComponent, not errorComponent
    return user
  },
  component: () => UserProfile,
  notFoundComponent: () => ({
    div: [
      { h1: "User not found" },
      { a: "Browse users", href: "/users" },
    ],
  }),
})
```

## Global not-found route

Catch all unmatched paths:

```ts
const rootRoute = createRootRoute({
  notFoundComponent: () => ({
    div: [
      { h1: "404 — Page not found" },
      { p: "The page you're looking for doesn't exist." },
      { a: "Back to home", href: "/" },
    ],
    style: { padding: "4rem", textAlign: "center" },
  }),
})
```

Or use `createRoute` with path `*`:

```ts
const catchAll = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: () => NotFoundPage,
})
```

## Error vs. not-found — when to use which

| Scenario | Use |
|----------|-----|
| Server error (5xx), network failure | `throw new Error(...)` → `errorComponent` |
| Resource doesn't exist (404) | `throw notFound()` → `notFoundComponent` |
| User not authorized (401/403) | `throw redirect(...)` → redirects to login |
| Missing required search param | `throw new Error(...)` or `throw notFound()` depending on UX |

## Retrying after error

The `reset` function in `errorComponent` re-runs the route:

```ts
const errorBoundary = ({ error, reset }) => ({
  div: [
    { p: `Error: ${(error as Error).message}` },
    {
      button: "Retry",
      onClick: async () => {
        // Optional: clear the cache before retrying
        await client.invalidateQueries()
        reset()
      },
    },
  ],
})
```

## Handling loader errors globally

Log all route errors centrally:

```ts
const router = createRouter({
  routeTree,
  onError: (error) => {
    console.error("Route error:", error)
    errorReporter.capture(error)
  },
})
```

## TypeScript: typed errors

When your loaders throw typed errors, narrow in `errorComponent`:

```ts
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const route = createRoute({
  loader: async () => {
    const res = await fetch("/api/data")
    if (!res.ok) throw new ApiError(res.status, await res.text())
    return res.json()
  },
  errorComponent: ({ error }) => {
    if (error instanceof ApiError) {
      return { div: `API Error ${error.status}: ${error.message}` }
    }
    return { div: "Unknown error" }
  },
})
```

## Pending component during error recovery

While a retry is in flight, show a pending state:

```ts
const route = createRoute({
  pendingComponent: () => ({ div: "Retrying…" }),
  pendingMinMs: 200,
  errorComponent: ({ reset }) => ({
    div: [
      { p: "Failed to load. " },
      { button: "Retry", onClick: reset },
    ],
  }),
})
```
