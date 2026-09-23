# @domphy/router

## 0.19.0

### Upstream re-sync: `@tanstack/router-core` 1.171.13 → 1.171.32

The load pipeline is rewritten upstream. `load-matches.ts` is split into `load-client.ts` + `load-server.ts`, `lru-cache.ts` is replaced by `sieve-cache.ts` (SIEVE eviction), and ten SSR modules are new. The client path is now transaction-owned: each load installs a transaction with its own `AbortController`, a superseding load aborts its predecessor, and every commit, store write and redirect-follow is gated on that transaction still being current.

**Breaking — removed upstream, therefore removed here:**

- `RouterState.statusCode` and `RouterState.redirect`. A server-side `load()` (router created with `isServer: true`) now reports its outcome on `router._serverResult`: `{ type: 'redirect', redirect }` or `{ type: 'render', status, matches }`.
- `RouterState.loadedAt` and `RouterState.isTransitioning`. `RouterState` is now exactly `{ status, isLoading, matches, location, resolvedLocation }`; a match's own `updatedAt` replaces `loadedAt`, and `isLoading` covers what `isTransitioning` reported.
- `router.hasNotFoundMatch()` — inspect `match.status === 'notFound'` on `router.state.matches`.
- `router.getMatch(matchId)`.
- `router.stores` is rebuilt around one match pool. Removed: `loadedAt`, `isLoading`, `isTransitioning`, `statusCode`, `redirect`, `pendingIds`, `cachedIds`, `pendingMatches`, `cachedMatches`, `firstId`, `hasPending`, `matchRouteDeps`, `pendingMatchStores`, `cachedMatchStores`, `setPending`, `setCached`. Renamed: `matchesId` → `ids`, `matchStores` → `byRoute`, `getRouteMatchStore` → `getMatchStore`. The surface is now `status`, `location`, `resolvedLocation`, `ids`, `matches`, `__store`, `byRoute`, `getMatchStore`, `setMatches`.
  - Replacements: `isLoading`/`hasPending` → `router.stores.status` (`'pending' | 'idle'`) or `router.state.isLoading`; `pendingMatches` → `router.stores.matches`, which upstream now publishes mid-load with the loading match carrying `status: 'pending'` (only while a `pendingComponent`/`defaultPendingComponent` is configured — see `offerPending` in `load-client.ts`); `cachedMatches` → the SIEVE cache is internal, inspect `router.state.matches`.
- `resolvePath` takes positional arguments: `resolvePath(base, to, trailingSlash?, cache?)` instead of an options object.
- `createLRUCache` / `src/lru-cache.ts` → `createSieveCache` / `src/sieve-cache.ts`.
- `MatchSupersededError` / `isMatchSupersededError` — a port-only sentinel for the stale-load abort, now handled upstream by the transaction's abort signal.
- `RouterCore.startTransition` is now `(fn, expectedMatches) => Promise<boolean>`. The core emits `onLoad` / `onBeforeRouteMount` / `onResolved` / `onRendered` itself; `onRendered` fires only when `startTransition` resolves `true`.

**Dependencies:** `@tanstack/history` `^1.162.0` → `^1.162.4` (1.171.32 imports `createServerHistory` and `normalizeProtocolRelative`).

**Deviations retired** (upstream fixed each defect itself, so the port re-aligns instead of keeping a parallel mechanism): the `RouterCore.load()` staleness gate, the `MatchSupersededError` sentinel, the SWR background-redirect check, the 30-minute `defaultGcTime` override (upstream re-aligned its JSDoc to its 5-minute code), the LRU `set()` reorder, the `resolvePath` root clamp, the `isDangerousProtocol` hardening (upstream's scheme-prefix parser is stricter — it also catches `/\evil.example`), and the SSR `Location`-header sanitization (that merge path no longer exists). `redirect()` still refuses to emit a dangerous `Location`; see `UPSTREAM.md` for the full table.

- Fix: `Router.destroy()` now also stops `load()`. `load` is an instance field, so a destroyed router still ran the whole core pipeline when `load()` was called (or when a history event raced teardown).
- Docs: `apps/web/docs/router/ssr.md` no longer reads `router.state.redirect` / `router.state.statusCode` (both removed). The server pattern now sets `isServer: true` and reads `router._serverResult` — required in the manual pattern, because a client-mode router on a server history loads forever on a redirecting route (a server history ignores `push()`). `api.md` drops `getMatch` and the removed `RouterState` fields.

### Other

- Fix: `createRequestHandler` forces `isServer: true` on the router it is handed. It installs a `createServerHistory` (whose `push()` is a no-op) and reads the outcome off `router._serverResult`, which only the server load pipeline writes — so it already required server mode without enforcing it. A router left in client mode looped `followRedirect` → `commitLocation` → `load` forever on a redirecting route, because the ignored `push()` never makes the target current and upstream's 20-redirect cap is keyed on that pending href: the request never terminated and the process grew until it OOMed. Where forcing cannot work — a server build that resolved this package's `browser` export condition, so the per-bundle `isServer` constant is `false` and outranks the option — the handler now throws a named error instead of hanging.
- Fix: `linkProps` re-synced to `@tanstack/react-router@1.170.38` (the release pairing with router-core `1.171.32`); it was ported from `1.170.16`. A `to` carrying a URL scheme is now classified by upstream's `getUrlScheme` before `buildLocation` runs, instead of by a `new URL(to)` probe afterwards — so `http://[` renders as the external link it is rather than being resolved as a path segment — and a destination whose protocol is outside `router.protocolAllowlist` now renders upstream's inert anchor (`role="link"` + `ariaDisabled`, no `href`, no `onClick`) rather than a bare anchor with neither href nor ARIA. The blocked-protocol check also covers an `href` that `history.createHref()` rewrote, as upstream's `getHrefOption` does.
- Fix: the transitioner's initial canonical-URL correction passes `ignoreBlocker: true`, as upstream's `<Transitioner>` does. Normalizing the URL the app was opened at is not a user navigation, so a registered blocker could veto it and leave the app on a non-canonical URL.
- New: `subscribeToRouterState(router, callback)` — subscribes to `router.stores.__store` and returns an unsubscribe. This is the headless equivalent of `@tanstack/react-router`'s `useRouterState`, and the only way to observe the `'pending'` flip: `onBeforeLoad` is emitted while `status` is still `'idle'` and `onLoad` only after the loaders settle, so an app mirroring router state from lifecycle events alone can never render a loading state. Mirror it into a Domphy state and read `state.isLoading`.
- New: `linkProps(router, options)` — headless port of `@tanstack/react-router`'s `useLinkProps` href/click logic. Returns `{ href, onClick, target?, role?, ariaDisabled? }` to spread into an `{ a: ... }` element. Modifier-clicks (ctrl/cmd/shift/alt), non-primary buttons, already-prevented events and `target` other than `_self` are left to the browser, so "open in new tab" works; masked destinations render `maskedLocation.publicHref`; a `to` written as an absolute URL renders as a native external link (upstream's `resolveExternalLink` branch) instead of being resolved as a path segment; a destination whose protocol is outside `router.protocolAllowlist`, like `disabled: true`, renders an inert `role="link"` + `ariaDisabled` anchor with no `href`. Type `LinkProps`.
- Fix: `Router.destroy()` now also stops the transitioner. `startTransition` is a field the transitioner installs on the router, so it outlived `cleanup()` — an explicit `load()` on a destroyed router still emitted `onLoad`/`onResolved`/`onRendered`, wrote `status`/`resolvedLocation`, and scheduled an `onRendered` timer that cleanup could no longer cancel.
- Docs: `data-loading.md` no longer claims a match reports `status: "pending"` while its loader runs — it does so only when a `pendingComponent` is configured, and otherwise the matches array still holds the previous route. `navigation.md` gains a "Bridging Router State" section, and both note that `isLoading` flips for cache hits too, so a spinner must wait out `defaultPendingMs` or it flashes on a cached revisit (reproduced in Chromium on the loader demo, then fixed there).
- Docs: the router guides no longer hand-roll `onClick: (e) => { e.preventDefault(); router.navigate(...) }`, which silently broke ctrl/cmd-click. Fixed `onMouseenter` → `onMouseEnter` and dropped a documented-but-nonexistent `preloadRoute({ intent })` option.
- Docs: `UPSTREAM.md` records every deviation from the pinned upstream, which of them the 1.171.32 re-sync retired, and the re-sync procedure that produced this state.

## 0.18.4

- `defaultGcTime` / `defaultPreloadGcTime` default to 30 minutes (`1_800_000` ms), matching the advertised TanStack contract (was 5 minutes).

## 0.18.3

- `MatchSupersededError` sentinel; SWR redirect abort when location is superseded; extra SSR/redirect tests.

## 0.18.2

- Security: `isDangerousProtocol` treats protocol-relative URLs (`//host`) and scheme-like URL-ctor failures as dangerous. `redirect()` no longer emits raw `//host` or `javascript:` `Location` headers; SSR header merge drops them too.
- Fix: SWR background loader redirects abort when `latestLocation` has been superseded (same identity check as `RouterCore.load()`).

## 0.18.1

- Tests: SSR server surface (`createRequestHandler`) smoke coverage for production request → load → Response path. Changelog

## 0.1.0
- Initial release: 1-1 port of @tanstack/router-core v1.171.13
- Port additions: `@tanstack/history` re-export, Domphy adapter (`createRouter`, `createRoute`, `createRootRoute`, `createRootRouteWithContext`, `createRouteMask`, `getRouteApi`) with a headless transitioner replacing upstream's React `<Transitioner>`
