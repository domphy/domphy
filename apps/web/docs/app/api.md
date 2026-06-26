# API Reference

## App

### `createApp(routes, options?)` / `DomphyApp`

| Member | Meaning |
| --- | --- |
| `app.router` | the `AppRouter` instance |
| `app.element()` | root `DomphyElement`; the route tree renders through one reactive child |
| `app.render(target)` | client render: starts the router, renders into `target` |
| `app.hydrate(target, style?)` | SSR hydration: seeds loader data from `bootstrapScript`, mounts onto existing DOM |
| `app.renderToString(url, { headers? })` | server render, returns `SSRResult` |
| `app.renderToStream(url, options?)` | streaming SSR; flushes the shell immediately, streams resolved content; returns `StreamResult` |
| `app.destroy()` | removes the tree and releases history listeners |

`AppOptions`: `history` (`HistoryAdapter | null`, default browser), `middleware`, `notFound`, `error`.

`SSRResult`: `html`, `css`, `head`, `status`, `redirect?`, `data`, `bootstrapScript`.

`StreamResult`: `stream` (`ReadableStream<Uint8Array>`), `status` (`number`), `redirect?` (`string`).

`RenderToStreamOptions` extends `RenderToStringOptions` with `head?` (markup for `<head>`, sent in the first flush) and `bootstrap?` (markup before `</body>`, typically the client bundle `<script>`).

## Router

### `AppRouter`

| Member | Meaning |
| --- | --- |
| `state` | `RecordState` with `pathname`, `search`, `hash`, `params`, `status`, `error` — all reactive |
| `tree` | `State<DomphyElement>` of the current route tree |
| `searchParams(listener?)` | current `URLSearchParams`, reactive |
| `navigate(href, { replace?, scroll? })` | client navigation |
| `push(href)` / `replace(href)` | navigation shorthands |
| `back()` / `forward()` | history traversal |
| `refresh()` | clear the loader cache, re-render the current URL |
| `prefetch(href)` | run target loaders ahead of navigation |
| `addEventListener(event, callback)` | `routeChangeStart` / `routeChangeComplete` / `routeChangeError`; returns a release function |
| `getMatch()` | the current `RouteMatch` (route chain + params) |
| `start()` / `destroy()` | lifecycle (called by `DomphyApp` for you) |

`getRouter()` returns the most recently created router (used by `navLink` by default).

## Routes

### `defineRoutes(routes)` / `Route`

`path`, `page`, `layout`, `loading`, `error`, `notFound`, `metadata`, `loader`, `revalidate`, `middleware`, `redirect`, `permanent`, `children`, `slots`, `intercept`, `lazy`. See [Routing](./routing).

`lazy: () => Promise<RouteModule>` — code-split the heavy parts of a route into a separately bundled module loaded on first match. The module may supply any of `page`, `layout`, `loading`, `error`, `notFound`, `metadata`, `loader`, or `middleware`; eager fields on the route win on conflict. Resolved once and cached for the lifetime of the route object.

`slots: Record<string, Route[]>` — parallel route slots rendered independently alongside the segment's main tree. Each slot is matched against the sub-path and passed as the third argument to the segment's `layout`. See [Routing — Parallel Routes](./routing#parallel-routes).

`intercept: true` — when set on a slot route, the route only matches during client-side navigation (soft nav), not on a hard load of the same URL. Used to render a modal or overlay over the current page while preserving the full-page view on direct URL access. See [Routing — Intercepting Routes](./routing#intercepting-routes).

### Blocks and contexts

- `PageBlock(context)` / `LayoutBlock(children, context, slots)` — receive `RouteContext`: `pathname`, `url`, `params`, `searchParams`, `hash`, `data`, `segmentData`, `headers?`. `slots` is `Record<string, DomphyElement>` containing rendered parallel-route slot trees.
- `LoadingBlock(context)`, `ErrorBlock(error, retry)`, `NotFoundBlock()`
- `Loader(loaderContext)` — `LoaderContext`: `pathname`, `url`, `params`, `searchParams`, `headers?`
- `Middleware(middlewareContext)` — `MiddlewareContext`: `url`, `pathname`, `searchParams`, `headers?`

## Navigation Control Flow

- `redirect(to)` / `permanentRedirect(to)` — throw, restart navigation at `to`
- `notFound()` — throw, render the nearest not-found boundary
- `rewrite(to)` — returned from middleware, render `to` under the original URL
- `RedirectSignal` / `NotFoundSignal` — the thrown classes, for custom catch logic

## Patches & Blocks

- `navLink({ href, prefetch?, replace?, scroll?, exact?, router? })` — `a` patch, see [Navigation](./navigation)
- `optimizedImage({ src, alt?, width?, height?, fill?, sizes?, quality?, priority?, placeholder?, blurDataURL?, loader?, deviceSizes? })` — `img` patch, see [Image & Script](./assets)
- `script({ src, strategy?, id?, async?, onLoad?, onError? })` — script block, see [Image & Script](./assets)

## Metadata

- `Metadata` type — see [Metadata](./metadata) for fields
- `resolveMetadata(values, context)` — merge a segment chain
- `metadataToHeadTags(resolved)` — flat head tag descriptions
- `renderHeadTags(tags)` — HTML string (SSR)
- `applyHeadTags(tags)` — write `document.head`

## API Routes

- `createApiHandler(routes)` — `(request: Request) => Promise<Response>`
- `json(data, init?)` — JSON response shorthand
- `ApiRoute`: `path` + `GET`/`POST`/`PUT`/`PATCH`/`DELETE`/`HEAD`/`OPTIONS` handlers `(request, { params })`

## Lower Level

- `compileRoutes(routes)` / `matchRoute(compiled, pathname)` / `matchPath(segments, pathname)` / `parseSegment(part)` — the matcher
- `buildHref(pattern, params)` — fill params into a pattern
- `createBrowserHistory()` / `createMemoryHistory(initial?)` / `HistoryAdapter` — history backends
- `DataCache` — the loader cache (`seed`, `invalidate`, `load`, `prefetch`, `onRevalidated`, `flushRevalidations`)
- `buildTree(...)` — composes layouts + boundaries (used by the router)
