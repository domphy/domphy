# API Reference

`@domphy/router` is a 1-1 port of `@tanstack/router-core` v1.171.13 — every export below has identical behavior to upstream, so the [TanStack Router reference](https://tanstack.com/router/latest) documents each item in full detail. The only additions are the `create*` adapter functions and the re-exported `@tanstack/history`.

## Creating Routers And Routes

| Export | Purpose |
|---|---|
| `createRouter(options)` | Create the router. Key options: `routeTree`, `history`, `context`, `defaultStaleTime`, `defaultPreloadStaleTime`, `defaultGcTime`, `parseSearch` / `stringifySearch`, `scrollRestoration` |
| `createRoute(options)` | Create a route: `getParentRoute`, `path` (or `id` for pathless layouts), `validateSearch`, `beforeLoad`, `loader`, `loaderDeps`, `staleTime`, `gcTime`, `shouldReload` |
| `createRootRoute(options?)` | Create the root of the tree |
| `createRootRouteWithContext<T>()` | Root route factory with a required typed router context |
| `rootRouteWithContext<T>()` | Alias for `createRootRouteWithContext` |
| `createRouteMask(options)` | Create a route mask (renders a different route at a given URL) |
| `getRouteApi(id)` | Get a type-safe route API handle by route id |
| `NotFoundRoute` | A pre-built route that renders a not-found boundary at any unmatched path |
| `RouterCore`, `BaseRoute`, `BaseRootRoute`, `BaseRouteApi` | The underlying classes (advanced — the `create*` functions wrap them) |
| `getStoreFactory` | Low-level store factory used by the router internals |

## Router Instance

The main members of the router returned by `createRouter`:

- `state` — `RouterState`: `matches`, `location`, `resolvedLocation`, `status` (`"pending" | "idle"`), `isLoading`, `statusCode`, `redirect`
- `navigate(options)` — navigate; resolves when loaders settle
- `buildLocation(options)` — resolve navigate options to a `ParsedLocation` without navigating
- `load()` — match and load the current location (call once at startup, and on the server)
- `subscribe(event, fn)` — lifecycle events: `onBeforeNavigate`, `onBeforeLoad`, `onLoad`, `onResolved`, `onBeforeRouteMount`, `onRendered`
- `invalidate(options?)` — mark cached loader data stale and re-run active loaders
- `preloadRoute(options)` — run matching + loaders for a destination ahead of navigation
- `matchRoute(location, options?)` — test a location against the tree (`{ fuzzy, includeSearch }`)
- `getMatch(matchId)` / `clearCache(options?)` — cache access (advanced)
- `history` — the underlying `RouterHistory` (`back`, `forward`, `go`, `block`)
- `update(options)` — update router options after creation

## History

Re-exported from `@tanstack/history`:

- `createBrowserHistory()`, `createHashHistory()`, `createMemoryHistory({ initialEntries })`, `createHistory()`
- `parseHref(href, state)`
- types: `RouterHistory`, `HistoryLocation`, `ParsedHistoryState`, `NavigationBlocker`, `BlockerFn`

## Control Flow

- `redirect(options)` / `isRedirect` / `isResolvedRedirect` / `parseRedirect` — throwable redirect Responses for `beforeLoad` and loaders
- `notFound(options?)` / `isNotFound` — throwable not-found errors
- `defer(promise)` / `TSR_DEFERRED_PROMISE` — deferred loader data with synchronous status

## Search Params

- `retainSearchParams(keys | true)` / `stripSearchParams(input)` — search middlewares
- `defaultParseSearch` / `defaultStringifySearch` — the JSON-aware default codec
- `parseSearchWith(parser)` / `stringifySearchWith(stringifier)` — build custom codecs
- `SearchParamError`, `PathParamError` — validation error classes

## Scroll Restoration

- `setupScrollRestoration(router)` — wire scroll save/restore (client)
- `getScrollRestorationScriptForRouter(router)` — inline pre-hydration script, from `@domphy/router/scroll-restoration-script`
- `defaultGetScrollRestorationKey`, `storageKey`

## Path Utilities

- `interpolatePath`, `resolvePath`, `joinPaths`, `cleanPath`, `trimPath` / `trimPathLeft` / `trimPathRight`, `removeTrailingSlash`, `exactPathTest`
- `encode` / `decode` — query-string primitives (`qss`)
- `rootRouteId` — the id of the root route (`"__root__"`)

## Utilities

- `functionalUpdate`, `replaceEqualDeep`, `deepEqual`, `isPlainObject`, `isPlainArray`, `hasKeys`
- `createControlledPromise`, `isModuleNotFoundError`, `escapeHtml`, `isDangerousProtocol`
- `defaultSerializeError`, `getLocationChangeInfo`, `lazyFn`, `isMatch`

## SSR Entry Points

| Entry | Main exports |
|---|---|
| `@domphy/router/ssr/server` | `createRequestHandler`, `attachRouterServerSsrUtils`, `transformStreamWithRouter`, `transformReadableStreamWithRouter`, `transformPipeableStreamWithRouter`, `createSsrStreamResponse`, `defineHandlerCallback`, `getOrigin`, `getNormalizedURL` |
| `@domphy/router/ssr/client` | `hydrate`, `json`, `mergeHeaders` |
| `@domphy/router/isServer` | `isServer` boolean, resolved per build condition |

See [SSR](./ssr) for how these fit Domphy.

## Types

All public types are re-exported, including:

- routes: `AnyRoute`, `Route`, `RouteOptions`, `RootRoute`, `RouteIds`, `RouteById`, `RoutePaths`
- router: `AnyRouter`, `RouterOptions`, `RouterState`, `RouterEvents`, `Register`, `RegisteredRouter`
- matches: `AnyRouteMatch`, `RouteMatch`, `MakeRouteMatch`
- navigation: `NavigateOptions`, `ToOptions`, `LinkOptions`, `ParsedLocation`, `ViewTransitionOptions`
- loading: `LoaderFnContext`, `RouteLoaderFn`, `DeferredPromise`
- search: `SearchMiddleware`, `SearchValidator`, `SearchParser`, `SearchSerializer`
- control flow: `Redirect`, `RedirectOptions`, `NotFoundError`
- ssr: `DehydratedRouter`, `DehydratedMatch`, `Manifest`, `RequestHandler`
