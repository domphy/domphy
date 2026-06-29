---
title: "Error Handling & Not Found"
description: "Route-level error components, not-found errors, error recovery, and fallback UIs."
---

# Error Handling & Not Found

## Handling loader errors

`@domphy/router` is headless — it does not render components automatically. When a loader throws, the match transitions to `status: "error"` and the error is available on the match. Check this in your UI:

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
})
```

In your UI layer, read `match.status` and `match.error`:

```ts
const PostView = {
  div: (l) => {
    const match = matches.get(l).find((m) => m.routeId === postRoute.id)
    if (!match) return []
    if (match.status === "error") return [
      { h2: "Something went wrong" },
      { p: (match.error as Error).message },
      { button: "Go back", onClick: () => history.back() },
    ]
    if (match.status === "pending") return [{ p: "Loading…" }]
    return [PostPage(match.loaderData)]
  },
}
```

## Not-found errors

When a resource doesn't exist (404-equivalent), throw `notFound()` from a loader. The match transitions to `status: "notFound"`:

```ts
import { createRoute, notFound } from "@domphy/router"

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$id",
  loader: async ({ params }) => {
    const user = await fetchUser(params.id)
    if (!user) throw notFound()
    return user
  },
})
```

In your UI, check `match.status === "notFound"` to render the not-found state.

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
