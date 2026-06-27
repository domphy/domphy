# Routing

Routes form a tree of `Route` objects. Each node is one URL segment — the equivalent of one folder in a Next.js `app/` directory. A node is routable when it declares `page` (or `redirect`).

## Segment Syntax

`path` uses the exact Next.js folder conventions:

| Pattern | Kind | Example match | `params` |
| --- | --- | --- | --- |
| `about` | static | `/about` | — |
| `docs/install` | static, multi-part | `/docs/install` | — |
| `[slug]` | dynamic | `/blog/hello` | `{ slug: "hello" }` |
| `[...parts]` | catch-all | `/docs/a/b` | `{ parts: ["a", "b"] }` |
| `[[...parts]]` | optional catch-all | `/gallery`, `/gallery/a` | `{ parts: [] }`, `{ parts: ["a"] }` |
| `(marketing)` | route group | no URL contribution | — |

Static segments win over dynamic, dynamic over catch-all — the same priority order as Next.js, so `/blog/featured` beats `/blog/[slug]`.

```ts
const routes = defineRoutes([
  {
    path: "/",
    page: HomePage,
    children: [
      { path: "blog", page: BlogIndexPage, children: [
        { path: "featured", page: FeaturedPage },
        { path: "[slug]", page: PostPage },
      ]},
      { path: "docs/[...parts]", page: DocsPage },
      { path: "(marketing)", children: [
        { path: "pricing", page: PricingPage },   // URL is /pricing
      ]},
    ],
  },
])
```

## Pages

A page is a block that receives the route context:

```ts
import type { RouteContext } from "@domphy/app"

function PostPage(context: RouteContext<Post>) {
  return {
    article: [
      { h1: context.data.title },
      { p: `slug: ${String(context.params.slug)}` },
      { p: `query: ${context.searchParams.get("ref") ?? "none"}` },
    ],
  }
}
```

`RouteContext` carries `pathname` (the rendered path, after any middleware rewrite), `url` (the address-bar path, before rewrites), `params`, `searchParams`, `hash`, `data` (the segment's loader result), and `segmentData` (every matched segment's loader result, keyed by segment id).

## Route Groups

Groups organize the tree — shared layouts, shared middleware — without affecting the URL, exactly like `(group)` folders:

```ts
{
  path: "(shop)",
  layout: ShopLayout,
  children: [
    { path: "products", page: ProductsPage },  // URL: /products
    { path: "cart", page: CartPage },          // URL: /cart
  ],
}
```

## Parallel Routes

A segment can render several independent route trees at once through `slots` — the equivalent of Next.js `@slot` folders. Each slot is matched against the path **below** the segment and rendered independently; the matched elements are passed to the layout's third argument:

```ts
{
  path: "dashboard",
  layout: (children, context, slots) => ({
    div: [
      { aside: [slots.nav ?? { span: "" }] },
      { section: [slots.analytics ?? { span: "" }] },
      children,
    ],
  }),
  slots: {
    nav: [
      { path: "", page: () => ({ nav: "Overview" }) },
      { path: "team", page: () => ({ nav: "Team nav" }) },
    ],
    analytics: [{ path: "", page: () => AnalyticsPanel() }],
  },
  children: [
    { path: "", page: DashboardHome },
    { path: "team", page: TeamPage },
  ],
}
```

At `/dashboard` the `nav` and `analytics` slots both match their `""` route; at `/dashboard/team` `nav` follows to its `team` route while `analytics` (no match for that sub-path) is simply omitted. Slots may declare their own `layout`, `loading`, `loader`, and even nested `slots` — they go through the same render and `DataCache` as the main tree.

## Intercepting Routes

A slot route marked `intercept: true` matches **only during client-side (soft) navigation** — a hard load or refresh of the same URL renders the real route instead. This is how Next.js intercepting routes (`(.)`, `(..)`, `(...)`) power "modal over the current page" patterns:

```ts
{
  path: "feed",
  layout: (children, _context, slots) => ({
    div: [children, slots.modal ?? { span: "" }],
  }),
  slots: {
    // soft-nav to /feed/photo/[id] -> renders the modal over the feed
    modal: [{ path: "photo/[id]", intercept: true, page: PhotoModal }],
  },
  children: [
    { path: "", page: Feed },
    // hard load of /feed/photo/[id] -> renders the full page
    { path: "photo/[id]", page: PhotoPage },
  ],
}
```

Style the intercepting slot as an overlay (a `dialog`, a portalled panel) and it appears above the previous content on in-app navigation, while a shared link to the same URL opens the standalone page.

## Redirect Routes

The equivalent of `redirects` in `next.config.js`:

```ts
{ path: "old-blog", redirect: "/blog", permanent: true }
```

On the client the router follows the redirect; on the server `renderToString` reports status `308` (or `307` when `permanent` is not set) plus the target in `result.redirect`.

## Lazy / Code-Split Routes

A route may declare `lazy: () => import("./page.js")` — any function returning a `Promise<RouteModule>`. The heavy parts of the route then live in a separately bundled module fetched on demand the first time the route is matched, rendered, navigated to, or prefetched. This is the equivalent of a dynamically imported route module in Next.js.

```ts
{
  path: "dashboard",
  metadata: { title: "Dashboard" }, // cheap, stays eager
  lazy: () => import("./dashboard.js"),
}
```

The lazy module may supply any module-level field: `page`, `layout`, `loading`, `error`, `notFound`, `metadata`, `loader`, and `middleware`.

```ts
// dashboard.js
export const page = DashboardPage
export const layout = DashboardLayout
export const loading = DashboardSkeleton
export const error = DashboardError
export const loader = async (context) => fetchDashboard(context)
```

How it behaves:

- **Resolved once, then cached.** The import is memoized per `Route` object — it runs at most once for the whole application, no matter how many renders, prefetches, or server routers touch the route.
- **Works with prefetch.** `navLink` prefetching (hover or visible) resolves the lazy module ahead of navigation, so the chunk is already loaded by the time you click.
- **Works with SSR and streaming.** The server awaits the import before rendering; while it resolves on the client, the route's `loading` block (eager or lazy) shows.
- **Errors route to the nearest boundary.** A rejected import is **not** cached — a later navigation retries — and the rejection is routed to the nearest `error` block, exactly like a thrown loader.
- **Eager fields win.** If a route declares a field both eagerly and in the lazy module, the eager one wins on conflict. The recommended split is therefore: keep cheap, statically inspectable config (`path`, `metadata`, `revalidate`, `redirect`) eager, and put the heavy `page` (and optionally `layout` / `loading`) in the lazy module. A route can also override a single block from a shared module this way.

```ts
{
  // Eager `loading` wins over the module's, so the shell renders instantly
  // while ./profile.js (with the heavy page) loads.
  path: "profile",
  loading: ProfileSkeleton,
  lazy: () => import("./profile.js"),
}
```

## Building URLs from Patterns

`buildHref(pattern, params)` is the inverse of the matcher: it fills a route pattern with concrete params and returns the URL string. This is useful for generating typed, param-safe links without string concatenation:

```ts
import { buildHref } from "@domphy/app"

buildHref("/blog/[slug]", { slug: "hello-world" })        // "/blog/hello-world"
buildHref("/docs/[...parts]", { parts: ["a", "b"] })      // "/docs/a/b"
buildHref("/(shop)/products", {})                          // "/products" (groups excluded)
buildHref("/[[...slug]]", { slug: [] })                    // "/"  (optional catch-all, empty)
```

Route groups are stripped (they don't affect the URL). Missing required params throw; missing optional catch-all params produce the root `/`.

## Reading the Current Route

`router.state` is a `RecordState` — every key is reactive:

```ts
const app = createApp(routes)

const Breadcrumb = {
  p: (listener) => `You are at ${app.router.state.get("pathname", listener)}`,
}
```

Available keys: `pathname`, `search`, `hash`, `params`, `status` (`"idle" | "loading" | "error" | "notfound"`), `error`. `router.searchParams(listener)` returns the current `URLSearchParams`.
