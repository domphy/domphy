# @domphy/query Changelog

## Unreleased

- Domphy adapter: reactive `throwOnError` now subscribes the listener **before** throwing, so a later recover (`refetch` / `reset`) re-renders — same order as TanStack React Query's `useSyncExternalStore`-then-throw.
- `createMutation`: `throwOnError` now throws on reactive field reads (with a listener), matching TanStack `useMutation`. Imperative reads without a listener never throw.
- `createInfiniteQuery`: `destroy()` / read-after-destroy tripwires now match `createQuery` (dev-warn once on stale reads, no-op + warn on a second `destroy()`).

## 0.18.2

- Vendored core re-synced to `@tanstack/query-core` v5.101.4 (was v5.90.20). All 24 vendored files remain byte-identical to the upstream tarball — zero deviations. Pin evidence: `SOURCES.md`.

## 0.18.1

- Domphy adapter: `throwOnError` now throws on **reactive** field reads (with a listener), matching TanStack React Query's render-time throw so `_onError` / `errorBoundary()` can catch query failures. Imperative reads without a listener never throw.

## 0.2.0
- Initial release: 1-1 port of @tanstack/query-core v5.90.20
