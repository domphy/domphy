# Middleware

Middleware runs before every navigation and server render — the `middleware.ts` equivalent. It can redirect, rewrite, raise a 404, or simply observe.

## Global Middleware

```ts
import { createApp, redirect, rewrite } from "@domphy/app"

const app = createApp(routes, {
  middleware: [
    (context) => {
      // Auth gate: redirect interrupts the navigation
      if (context.pathname.startsWith("/admin") && !isLoggedIn()) {
        redirect("/login")
      }
    },
    (context) => {
      // Rewrite: render another route, keep the URL
      if (context.pathname === "/home") return rewrite("/")
    },
  ],
})
```

The `MiddlewareContext` carries `url`, `pathname`, `searchParams` and (on the server) `headers`. Middleware may be async.

## Results

| Action | Effect |
| --- | --- |
| return nothing | continue to the next middleware |
| `return rewrite(path)` | match and render `path`, address bar keeps the original URL |
| `redirect(path)` / `permanentRedirect(path)` (throws) | restart navigation at `path`; SSR reports 307/308 + `result.redirect` |
| `notFound()` (throws) | render the not-found boundary; SSR reports 404 |

## Per-Route Middleware

Routes can attach middleware that runs only when their subtree matches — runs for the whole chain, root first:

```ts
{
  path: "(admin)",
  middleware: [requireAdminSession],
  children: [
    { path: "dashboard", page: DashboardPage },
    { path: "settings", page: SettingsPage },
  ],
}
```

Global middleware runs before matching (so it can rewrite the path); per-route middleware runs after matching, before loaders.
