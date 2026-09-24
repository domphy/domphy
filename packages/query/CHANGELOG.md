# @domphy/query Changelog

## 0.19.1

- Republish of 0.19.0 with no code change: the 0.19.0 tarball was published with raw `workspace:` dependency specifiers (published with `npm publish` instead of `pnpm publish`), so it could not be installed outside this monorepo. 0.19.0 is deprecated on npm.

## 0.19.0

- Vendored core resynced to `@tanstack/query-core@5.103.2` (from 5.101.4); all 23 upstream files are byte-identical again, still with zero deviations. Upstream deleted `src/thenable.ts` (the retryer uses a plain `Promise` + status flag, `hydration` a local `tryResolveSync`) and removed `experimental_prefetchInRender` / `QueryObserverResult.promise` — neither was referenced by the Domphy adapter, its tests or the docs. Behavior gained: `fetchOptimistic` resolves early when an external cache write lands before the in-flight fetch; `QueriesObserver` de-duplicates `trackProp` fan-out per notify and skips `combine` when none is supplied; server / `enabled: false` / invalid-timeout guards for the stale timer and the refetch interval are unified. Additive exports: `dehydrateQuery`, and the types `FocusManager`, `OnlineManager`, `TimeoutManager`, `MutationCacheConfig`, `QueryCacheConfig`.
- `dist/query.global.js` (the `unpkg`/`jsdelivr` entry) no longer throws `ReferenceError: process is not defined` on the first `new QueryClient()` in a plain `<script>` tag. The iife build now inlines `process.env.NODE_ENV`, so esbuild strips the dev-only branches in `query.ts` / `utils.ts` / `timeoutManager.ts` / `hydration.ts` / `queriesObserver.ts` instead of leaving a live `process` read.

## 0.18.3

- Domphy adapter: reactive `throwOnError` now subscribes the listener **before** throwing, so a later recover (`refetch` / `reset`) re-renders — same order as TanStack React Query's `useSyncExternalStore`-then-throw.
- `createMutation`: `throwOnError` now throws on reactive field reads (with a listener), matching TanStack `useMutation`. Imperative reads without a listener never throw.
- `createInfiniteQuery`: `destroy()` / read-after-destroy tripwires now match `createQuery` (dev-warn once on stale reads, no-op + warn on a second `destroy()`).

## 0.18.2

- Vendored core re-synced to `@tanstack/query-core` v5.101.4 (was v5.90.20). All 24 vendored files remain byte-identical to the upstream tarball — zero deviations. Pin evidence: `SOURCES.md`.

## 0.18.1

- Domphy adapter: `throwOnError` now throws on **reactive** field reads (with a listener), matching TanStack React Query's render-time throw so `_onError` / `errorBoundary()` can catch query failures. Imperative reads without a listener never throw.

## 0.2.0
- Initial release: 1-1 port of @tanstack/query-core v5.90.20
