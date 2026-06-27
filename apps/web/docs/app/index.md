<script setup lang="ts">
import Basic from "../demos/app/basic.ts?raw"
</script>

# App

`@domphy/app` ports the **Next.js App Router feature set** to Domphy: nested routing and layouts, client navigation with prefetching, loading/error/not-found boundaries, data loading with revalidation, the Metadata API, middleware, server rendering with hydration, and API route handlers.

It is a runtime library. Routes are declared as a plain object tree — the equivalent of the `app/` directory — and pages and layouts are ordinary Domphy blocks. No bundler plugin, no file-system convention, no compiler.

## Install

::: code-group
```bash [NPM]
npm install @domphy/app
```
```html [CDN]
<script src="https://unpkg.com/@domphy/app/dist/app.global.js"></script>
```
:::

The CDN bundle exposes `Domphy.app` with all exports.

## Live Example

<CodeEditor :code="Basic" />

## The Mental Model

One `Route` object equals one folder in a Next.js `app/` directory:

| `app/` directory | `Route` field |
| --- | --- |
| folder name (`blog`, `[slug]`, `(group)`) | `path` |
| `page.tsx` | `page` |
| `layout.tsx` | `layout` |
| `loading.tsx` | `loading` |
| `error.tsx` | `error` |
| `not-found.tsx` | `notFound` |
| server data fetching | `loader` (+ `revalidate`) |
| `metadata` / `generateMetadata` | `metadata` |
| nested folders | `children` |
| `@slot` folders | `slots` |
| `(.)intercept` pattern | `intercept: true` |
| dynamic `import()` | `lazy` |

```ts
import { createApp, defineRoutes } from "@domphy/app"

const routes = defineRoutes([
  {
    path: "/",
    layout: (children) => ({ div: [Header(), children] }),
    page: () => ({ h1: "Home" }),
    children: [
      { path: "about", page: () => ({ h1: "About" }) },
      {
        path: "blog/[slug]",
        loader: async ({ params }) => fetchPost(params.slug as string),
        page: (context) => ({ h1: (context.data as Post).title }),
      },
    ],
  },
])

const app = createApp(routes)
await app.render(document.getElementById("app")!)
```

## What Is Ported

- **Routing** — static, dynamic `[slug]`, catch-all `[...parts]`, optional catch-all `[[...parts]]`, route groups `(group)`, route-level redirects. [Routing](./routing)
- **Parallel routes** — `slots` on any segment renders independent subtrees alongside the main tree; each slot is matched and passed to the layout's third argument. [Parallel & Intercepting Routes](./routing#parallel-routes)
- **Intercepting routes** — `intercept: true` on a slot route renders only during client-side navigation (modal-over-feed pattern), letting the real page handle hard loads. [Intercepting Routes](./routing#intercepting-routes)
- **Lazy / code-split routes** — `lazy: () => import("./page.js")` defers the bundle for a route; resolved once and cached. Works with prefetch and SSR. [Lazy Routes](./routing#lazy--code-split-routes)
- **Layouts and boundaries** — nested layouts that persist across navigation, `loading`, `error` and `notFound` boundaries per segment. [Layouts](./layouts)
- **Navigation** — `navLink()` patch (the `next/link` equivalent with prefetching and active state), `router.push/replace/back/forward/refresh/prefetch`, navigation events. [Navigation](./navigation)
- **Data loading** — per-segment `loader` with `revalidate` caching and stale-while-revalidate, `redirect()` and `notFound()` from loaders. [Data Fetching](./data-fetching)
- **Metadata** — title templates, Open Graph, Twitter, icons, robots, canonical. [Metadata](./metadata)
- **Middleware** — global and per-route, with `redirect()`, `rewrite()` and auth-guard patterns. [Middleware](./middleware)
- **SSR** — `renderToString()` plus `renderToStream()` (shell-first streaming) and `hydrate()` with embedded loader data. [SSR](./ssr)
- **API routes** — `createApiHandler()` on web-standard Request/Response. [API Routes](./api-routes)
- **Image and Script** — `optimizedImage()` and `script()` helpers. [Image & Script](./assets)
- **i18n routing** — `createI18nMiddleware()` handles locale-prefix URLs (`/vi/about` → rewrite to `/about`); `getLocale()` reads the active locale from any context. Works with `@domphy/i18n` for translations. [i18n Routing](./i18n)
- **Cookies** — `cookies(headers?)` parses the Cookie header into a `ReadonlyMap`, the equivalent of Next.js `cookies()`. [Data Fetching](./data-fetching#reading-cookies)

## What Is Not Ported

Build-time concerns stay with your bundler or host server: the compiler and dev server, React Server Components, static export, font optimization, and the image optimization server (`optimizedImage` delegates URL generation to any image CDN through its `loader` prop).
