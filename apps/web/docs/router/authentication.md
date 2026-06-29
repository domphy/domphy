---
title: "Authenticated Routes"
description: "Protect routes behind auth checks, redirect unauthenticated users, and handle login flows."
---

# Authenticated Routes

## Route context for auth

Inject authentication state into the router via `context`. This lets all routes access auth without prop-threading:

```ts
import { createRouter, createRootRouteWithContext } from "@domphy/router"
import { toState } from "@domphy/core"

interface AuthContext {
  isAuthenticated: () => boolean
  user: () => User | null
}

// Root route typed with context
const rootRoute = createRootRouteWithContext<AuthContext>()({})

// Provide context when creating the router
const auth = {
  isAuthenticated: () => !!localStorage.getItem("token"),
  user: () => JSON.parse(localStorage.getItem("user") ?? "null"),
}

const router = createRouter({
  routeTree: rootRoute,
  context: auth,
})
```

## Protecting a route with `beforeLoad`

Use `beforeLoad` to redirect unauthenticated users before the route renders:

```ts
import { createRoute, redirect } from "@domphy/router"

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated()) {
      throw redirect({ to: "/login", search: { returnTo: "/dashboard" } })
    }
  },
  component: () => Dashboard,
})
```

`beforeLoad` runs on every navigation to the route. Throwing `redirect(...)` cancels the navigation and redirects instead.

## Redirect with return URL

After login, redirect back to the page the user was trying to reach:

```ts
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search) => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : "/",
  }),
  component: () => LoginPage,
})

// In LoginPage:
const LoginPage = {
  form: [
    // ... form fields
    {
      button: "Log in",
      onClick: async () => {
        await login(credentials)
        const returnTo = router.state.location.search.returnTo ?? "/"
        router.navigate({ to: returnTo })
      },
    },
  ],
}
```

## Auth group route (layout route)

Create a pathless layout route that wraps all authenticated pages. Put the `beforeLoad` check once:

```ts
const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "_auth",   // no path — just a guard
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated()) {
      throw redirect({ to: "/login" })
    }
  },
})

// All children are automatically protected
const dashboardRoute = createRoute({ getParentRoute: () => authLayout, path: "/dashboard" })
const settingsRoute  = createRoute({ getParentRoute: () => authLayout, path: "/settings" })
const profileRoute   = createRoute({ getParentRoute: () => authLayout, path: "/profile" })

// In the App renderers map, the auth layout wraps its children with NavBar:
const renderers: Record<string, (match: AnyRouteMatch, rest: AnyRouteMatch[]) => DomphyElement> = {
  [authLayout.id]: (_match, rest) => ({
    div: [NavBar, ...rest.map((m) => renderMatch(m, rest.slice(1)))],
  }),
  [dashboardRoute.id]: () => DashboardPage,
  [settingsRoute.id]:  () => SettingsPage,
  [profileRoute.id]:   () => ProfilePage,
}
```

## Role-based access control

Check roles in `beforeLoad`:

```ts
const adminRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/admin",
  beforeLoad: ({ context }) => {
    const user = context.user()
    if (!user || user.role !== "admin") {
      throw redirect({ to: "/", search: { error: "forbidden" } })
    }
  },
  component: () => AdminPanel,
})
```

For multiple roles:

```ts
function requireRole(...roles: string[]) {
  return ({ context }: { context: AuthContext }) => {
    const user = context.user()
    if (!user || !roles.includes(user.role)) {
      throw redirect({ to: "/" })
    }
  }
}

const editorRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/editor",
  beforeLoad: requireRole("editor", "admin"),
  component: () => EditorPage,
})
```

## Token refresh in loaders

Handle expired tokens before loading route data:

```ts
const protectedRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/data",
  beforeLoad: async ({ context }) => {
    // If token is expired, refresh before proceeding
    if (isTokenExpired()) {
      try {
        await refreshToken()
      } catch {
        throw redirect({ to: "/login" })
      }
    }
  },
  loader: async () => {
    // Token is now valid
    return fetchProtectedData()
  },
})
```

## Loading auth state asynchronously

When auth state is fetched from the server (not from localStorage), defer rendering until it's ready:

```ts
const authState = toState<{ user: User | null; loading: boolean }>({
  user: null, loading: true,
})

// Fetch auth on app start
async function initAuth() {
  try {
    const user = await fetchCurrentUser()
    authState.set({ user, loading: false })
  } catch {
    authState.set({ user: null, loading: false })
  }
}

initAuth()

const App = {
  div: (l) => {
    const { loading } = authState.get(l)
    if (loading) return { div: "Loading…" }
    return RouterApp
  },
}
```

Then provide `user` from `authState` in the router context.

## Logout

Clear auth state and redirect to login:

```ts
function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  // Invalidate all cached query data
  client.clear()
  router.navigate({ to: "/login" })
}

const LogoutButton = {
  button: "Log out",
  onClick: logout,
}
```
