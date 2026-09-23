# API Reference

Complete list of exports from `@domphy/router`.

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

## Links

| Export | Purpose |
|---|---|
| `linkProps(router, options)` | Build `{ href, onClick, target? }` for an anchor that navigates through the router. Takes the full `NavigateOptions` set plus `target` and `disabled`. Leaves modifier-clicks, non-primary buttons, already-prevented events, and non-`_self` targets to the browser. Shows `maskedLocation.publicHref` when the destination is masked; an absolute-URL `to` renders as a native external link (no click interception); omits `href` for URLs whose protocol is outside `router.protocolAllowlist` and for `disabled: true` (which returns `role="link"` + `ariaDisabled`). Type: `LinkProps` |

## Router Instance

The main members of the router returned by `createRouter`:

- `state` — `RouterState`: `matches`, `location`, `resolvedLocation`, `status` (`"pending" | "idle"`), `isLoading`
- `navigate(options)` — navigate; resolves when loaders settle
- `buildLocation(options)` — resolve navigate options to a `ParsedLocation` without navigating
- `load()` — match and load the current location (call once at startup, and on the server)
- `subscribe(event, fn)` — lifecycle events: `onBeforeNavigate`, `onBeforeLoad`, `onLoad`, `onResolved`, `onBeforeRouteMount`, `onRendered`
- `subscribeToRouterState(router, fn)` — a free function, not a method: subscribes to every write to `router.state` and returns an unsubscribe. The only way to observe `status` flipping to `"pending"` (no lifecycle event fires at that moment), so this is what pending/spinner UI bridges from
- `invalidate(options?)` — mark cached loader data stale and re-run active loaders
- `preloadRoute(options)` — run matching + loaders for a destination ahead of navigation
- `matchRoute(location, options?)` — test a location against the tree (`{ fuzzy, includeSearch }`)
- `clearCache(options?)` — drop cached loader data (`{ filter }` selects which matches; advanced)
- `_serverResult` — after a server-side `load()` (router created with `isServer: true`), the outcome of that load: `{ type: "redirect", redirect }` or `{ type: "render", status, matches }`. This is how SSR reads the redirect and the HTTP status; see [SSR](./ssr)
- `history` — the underlying `RouterHistory` (`back`, `forward`, `go`, `block`)
- `update(options)` — update router options after creation; replacing `history` re-targets the client's history subscription automatically
- `destroy()` — release the client transitioner's history subscription and the scroll-restoration listeners (call when discarding a router instance, e.g. HMR or locale-switch patterns). A destroyed router emits no further lifecycle events, even if `load()` is called on it

## History

Available from `@domphy/router`:

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
| `@domphy/router/ssr/server` | `createRequestHandler`, `attachRouterServerSsrUtils`, `transformStreamWithRouter`, `transformReadableStreamWithRouter`, `transformPipeableStreamWithRouter`, `createSsrStreamResponse`, `defineHandlerCallback`, `getOrigin`, `getNormalizedURL`; types: `RequestHandler` |
| `@domphy/router/ssr/client` | `hydrate`, `json`, `mergeHeaders`; types: `DehydratedRouter`, `DehydratedMatch` |
| `@domphy/router/isServer` | `isServer` — `boolean | undefined`, resolved per build condition; `undefined` in development/test, `true` on server runtimes, `false` in browsers |

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
- ssr: `Manifest`
