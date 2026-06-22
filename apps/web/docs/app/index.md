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
- **Layouts and boundaries** — nested layouts that persist across navigation, `loading`, `error` and `notFound` boundaries per segment. [Layouts](./layouts)
- **Navigation** — `navLink()` patch (the `next/link` equivalent with prefetching and active state), `router.push/replace/back/forward/refresh/prefetch`, navigation events. [Navigation](./navigation)
- **Data loading** — per-segment `loader` with `revalidate` caching, `redirect()` and `notFound()` from loaders. [Data Fetching](./data-fetching)
- **Metadata** — title templates, Open Graph, Twitter, icons, robots, canonical. [Metadata](./metadata)
- **Middleware** — global and per-route, with `redirect()` and `rewrite()`. [Middleware](./middleware)
- **SSR** — `renderToString()` plus `hydrate()` with embedded loader data. [SSR](./ssr)
- **API routes** — `createApiHandler()` on web-standard Request/Response. [API Routes](./api-routes)
- **Image and Script** — `optimizedImage()` and `script()` helpers. [Image & Script](./assets)

## What Is Not Ported

Build-time concerns stay with your bundler or host server: the compiler and dev server, React Server Components, static export, font optimization, and the image optimization server (`optimizedImage` delegates URL generation to any image CDN through its `loader` prop).
