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

`RouteContext` carries `pathname`, `params`, `searchParams`, `hash`, `data` (the segment's loader result) and `segmentData` (every matched segment's loader result, keyed by segment id).

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

## Redirect Routes

The equivalent of `redirects` in `next.config.js`:

```ts
{ path: "old-blog", redirect: "/blog", permanent: true }
```

On the client the router follows the redirect; on the server `renderToString` reports status `308` (or `307` when `permanent` is not set) plus the target in `result.redirect`.

## Reading the Current Route

`router.state` is a `RecordState` — every key is reactive:

```ts
const app = createApp(routes)

const Breadcrumb = {
  p: (listener) => `You are at ${app.router.state.get("pathname", listener)}`,
}
```

Available keys: `pathname`, `search`, `hash`, `params`, `status` (`"idle" | "loading" | "error" | "notfound"`), `error`. `router.searchParams(listener)` returns the current `URLSearchParams`.
