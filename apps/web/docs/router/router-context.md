---
title: "Router Context"
description: "Inject dependencies into all routes via router context — auth, query clients, feature flags, and shared services."
---

# Router Context

Router context is a typed object available to every route's `beforeLoad`, `loader`, and component. It's the correct way to share dependencies (auth state, query clients, analytics) with routes without globals.

## Defining context type

```ts
import { createRootRouteWithContext, createRouter } from "@domphy/router"
import { QueryClient } from "@domphy/query"

interface RouterContext {
  queryClient: QueryClient
  auth: {
    isAuthenticated: () => boolean
    user: () => User | null
  }
  featureFlags: {
    newDashboard: boolean
    betaSearch: boolean
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({})
```

## Providing context when creating the router

```ts
const queryClient = new QueryClient()

const router = createRouter({
  routeTree: rootRoute.addChildren([...]),
  context: {
    queryClient,
    auth: {
      isAuthenticated: () => !!localStorage.getItem("token"),
      user: () => JSON.parse(localStorage.getItem("user") ?? "null"),
    },
    featureFlags: {
      newDashboard: import.meta.env.VITE_NEW_DASHBOARD === "true",
      betaSearch: false,
    },
  },
})
```

## Accessing context in `beforeLoad`

```ts
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated()) {
      throw redirect({ to: "/login" })
    }
  },
})
```

## Accessing context in loaders

```ts
const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts",
  loader: async ({ context }) => {
    // Use queryClient from context — no global import needed
    return context.queryClient.ensureQueryData({
      queryKey: ["posts"],
      queryFn: fetchPosts,
    })
  },
})
```

## Accessing context in components

Access router context in a component via `router.options.context`:

```ts
const ProfilePage = {
  div: (l) => {
    const user = router.options.context.auth.user()
    return { h1: `Welcome, ${user?.name ?? "Guest"}` }
  },
}
```

Or pass it through loaderData and read in your UI element:

```ts
const userRoute = createRoute({
  loader: ({ context }) => ({ user: context.auth.user() }),
})

const UserView = {
  h1: (l) => {
    const match = matches.get(l).find(m => m.routeId === userRoute.id)
    const user = match?.loaderData?.user
    return `Welcome, ${user?.name ?? "Guest"}`
  },
}
```

## Dynamic context (reactive values)

If context values change after the router is created (e.g. auth state updates), pass an accessor function instead of a static value:

```ts
import { toState } from "@domphy/core"

const authState = toState<{ user: User | null; token: string | null }>({
  user: null,
  token: localStorage.getItem("token"),
})

const router = createRouter({
  routeTree,
  context: {
    // These functions read from reactive state — always current
    auth: {
      isAuthenticated: () => !!authState.get().token,
      user: () => authState.get().user,
    },
    queryClient,
  },
})

// When auth changes, context.auth.user() automatically returns the new value
async function login(credentials: Credentials) {
  const { user, token } = await loginApi(credentials)
  authState.set({ user, token })
  localStorage.setItem("token", token)
  router.navigate({ to: "/dashboard" })
}
```

## Per-route context modification

A route can add to the context for its children using `beforeLoad`'s return value:

```ts
const orgRoute = createRoute({
  getParentRoute: () => authRoute,
  path: "/org/$orgId",
  beforeLoad: async ({ params, context }) => {
    const org = await context.queryClient.ensureQueryData({
      queryKey: ["org", params.orgId],
      queryFn: () => fetchOrg(params.orgId),
    })
    // Return additional context — available to all child routes
    return { org }
  },
})

const settingsRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "/settings",
  loader: ({ context }) => {
    // context.org is available here — provided by orgRoute.beforeLoad
    return fetchOrgSettings(context.org.id)
  },
})
```

## TypeScript: typed context

With `createRootRouteWithContext<RouterContext>()`, TypeScript fully types all context accesses:

```ts
// beforeLoad context is RouterContext — full type safety
beforeLoad: ({ context }) => {
  context.auth.isAuthenticated()   // ✓ () => boolean
  context.queryClient.prefetchQuery   // ✓ QueryClient method
  context.featureFlags.newDashboard   // ✓ boolean
  context.auth.unknownMethod()   // ✗ TypeScript error
}
```
