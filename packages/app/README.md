# @domphy/app

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/app/) · [npm](https://www.npmjs.com/package/@domphy/app)

A port of the Next.js App Router feature set for Domphy: nested routing and layouts, client navigation with prefetching, loading/error/not-found boundaries, data loading with revalidation, the Metadata API, middleware, server rendering with hydration, API route handlers, and image/script helpers.

It is a runtime library — routes are declared as a plain object tree (the equivalent of the `app/` directory) and pages/layouts are ordinary Domphy blocks. No bundler plugin or file-system convention is required.

## Install

```bash
npm install @domphy/app
```

## Quick Example

```ts
import { createApp, defineRoutes, navLink } from "@domphy/app"
import type { RouteContext } from "@domphy/app"

const routes = defineRoutes([
  {
    path: "/",
    layout: (children) => ({
      div: [
        { nav: [{ a: "Home", $: [navLink({ href: "/" })] }] },
        children,
      ],
    }),
    page: () => ({ h1: "Home" }),
    metadata: { title: { default: "My Site", template: "%s | My Site" } },
    children: [
      {
        path: "blog/[slug]",
        loader: async ({ params }) => fetchPost(params.slug as string),
        loading: () => ({ p: "Loading..." }),
        metadata: (context) => ({ title: `Post ${context.params.slug}` }),
        page: (context: RouteContext<Post>) => ({
          article: [{ h1: context.data.title }, { p: context.data.body }],
        }),
      },
    ],
  },
])

const app = createApp(routes)
await app.render(document.getElementById("app")!)
```

## Feature Map

| Next.js | @domphy/app |
| --- | --- |
| `app/` directory segments | `Route` tree (`path`, `children`) |
| `page.tsx` / `layout.tsx` | `page` / `layout` blocks |
| `loading.tsx` / `error.tsx` / `not-found.tsx` | `loading` / `error` / `notFound` blocks |
| `[slug]`, `[...all]`, `[[...all]]`, `(group)` | same segment syntax in `path` |
| `fetch` caching / ISR `revalidate` | `loader` + `revalidate` seconds |
| `next/link` | `navLink()` patch (prefetch on hover/visible, active state) |
| `useRouter()` | `app.router` — `push`, `replace`, `back`, `forward`, `refresh`, `prefetch` |
| `usePathname()` / `useSearchParams()` | `router.state.get("pathname", listener)` / `router.searchParams(listener)` |
| `redirect()` / `permanentRedirect()` / `notFound()` | same functions, callable from loaders, metadata and middleware |
| `middleware.ts` (redirect, rewrite) | `middleware` option + `rewrite()` |
| Metadata API / `generateMetadata` | `metadata` object or function per segment |
| SSR + hydration | `app.renderToString(url)` + `app.hydrate(target)` |
| `route.ts` API handlers | `createApiHandler()` on web-standard Request/Response |
| `next/image` | `optimizedImage()` patch (lazy, srcset via loader, fill, blur) |
| `next/script` | `script()` block (afterInteractive, lazyOnload, dedupe) |

Out of scope (build-time concerns that belong to your bundler or host): the compiler/dev server, React Server Components, static export, font optimization and the image optimization server (`optimizedImage` delegates URL generation to any image CDN through its `loader` prop).

## Server Rendering

```ts
const result = await app.renderToString(request.url, { headers: request.headers })
// result.html, result.css, result.head, result.status, result.redirect,
// result.bootstrapScript (inline loader data for hydration)
```

On the client, pass the server-rendered `<style id="domphy-style">` element as the
second argument so reactive style updates after hydration are not dropped:

```ts
const mountTarget = document.getElementById("app")!.firstElementChild as HTMLElement
const style = document.getElementById("domphy-style") as HTMLStyleElement
await app.hydrate(mountTarget, style)
```

## Documentation

Full guides at [domphy.com/docs/app](https://domphy.com/docs/app/).
