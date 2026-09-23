# @domphy/query — Sources

`@domphy/query` is a byte-level port of [**@tanstack/query-core**](https://github.com/TanStack/query/tree/main/packages/query-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`). This file records which upstream version was ported, the evidence for that pin, the port's scope, and every intentional deviation from upstream.

## Upstream version

**Pinned: `@tanstack/query-core@5.103.2`** (npm). Synced 5.90.20 → 5.101.4 on 2026-08-04 (wave-3 deferral; see `.stable-audit/29-deferral-wave3-query-form-resync.md`), then 5.101.4 → 5.103.2 on 2026-09-23.

Evidence (direct, not inferred):

1. **Full-tree diff.** Every file under `src/` that has an upstream counterpart (`environmentManager.ts`, `focusManager.ts`, `hydration.ts`, `index.ts`, `infiniteQueryBehavior.ts`, `infiniteQueryObserver.ts`, `mutation.ts`, `mutationCache.ts`, `mutationObserver.ts`, `notifyManager.ts`, `onlineManager.ts`, `queriesObserver.ts`, `query.ts`, `queryCache.ts`, `queryClient.ts`, `queryObserver.ts`, `removable.ts`, `retryer.ts`, `streamedQuery.ts`, `subscribable.ts`, `timeoutManager.ts`, `types.ts`, `utils.ts`) is byte-identical to the `5.103.2` npm tarball (`https://registry.npmjs.org/@tanstack/query-core/-/query-core-5.103.2.tgz`). Verified 2026-09-23 by `diff -q` on all 23 files: **0 differing files**. The only non-upstream file under `src/` is `global.ts` (tsup global build shim). Reproduce with `npm pack @tanstack/query-core@5.103.2`.
2. **Dependency signature.** Upstream query-core has zero runtime dependencies at 5.90.20, 5.101.4 and 5.103.2; `@domphy/query` likewise has zero runtime dependencies.

### What the 5.101.4 → 5.103.2 resync brought in

The raw diff is ~2,800 lines across 21 files, but with block/line comments stripped the real code delta is ~646 lines across 16 files — most of the churn is upstream adding JSDoc to the public option/result types. Substantive changes:

- **`src/thenable.ts` deleted.** Upstream dropped the custom pending-thenable machinery. `retryer.ts` now uses a plain `Promise` plus an external `status` variable (`'pending' | 'resolved' | 'rejected'`); `hydration.ts` carries its own local `tryResolveSync`. `thenable.ts` was never re-exported from `src/index.ts`, so this is not a public-API removal for `@domphy/query`.
- **`experimental_prefetchInRender` and `QueryObserverResult.promise` removed** (upstream). Neither is referenced by `src/domphy/`, the tests or `apps/web/docs/query` — grep is empty — so nothing in this repo depended on them.
- `QueryObserver.fetchOptimistic` races the fetch against a query-cache subscription, so an external cache write resolves it early instead of waiting for the in-flight fetch.
- `resolveQueryBoolean` + `resolveStaleTime` collapsed into one generic `resolveQueryValue`; `refetchInterval` resolution goes through it too. All three are internal to `src/utils.ts` (not re-exported from `index.ts`).
- `#shouldScheduleTimer` centralises the server / `enabled: false` / invalid-timeout guard shared by the stale timeout and the refetch interval.
- `shouldAssignObserverCurrentProperties` replaced by a direct `shallowEqualObjects(this.getCurrentResult(), result)` check.
- `environmentManager` is a plain object exporting a module-level `isServer()`; `QueriesObserver` de-duplicates `trackProp` fan-out per notify, skips `combine` when no `combine` is supplied, and no longer allocates through `replaceAt`.
- Additive `index.ts` exports: `dehydrateQuery`, and the types `FocusManager`, `OnlineManager`, `TimeoutManager`, `MutationCacheConfig`, `QueryCacheConfig`.

What the 5.90.20 → 5.101.4 sync brought in (classified in `.stable-audit/29-deferral-wave3-query-form-resync.md`; no breaking changes for this port or its adapter):

- New `environmentManager` (overridable server-environment detection) — new file, exported from `index.ts`.
- Infinite-query behavior refactor: `_type: 'infinite'` on query options replaces explicit `options.behavior` assignment, and `queryType` now round-trips through `dehydrate`/`hydrate`.
- Hydration fixes: a query pending at dehydration but resolved before hydration is now hydrated as `success` (with `dataUpdatedAt`); no retryer is created when data was synchronously available.
- `Query.isFetched()` / `Query.resetState` getters; `streamedQuery` reset-mode uses them.
- `retryOnMount` accepts a function (`resolveEnabled` renamed `resolveQueryBoolean`).
- `partialMatchKey` compares arrays element-wise.
- Timer-id falsy checks replaced with `!== undefined` (timer id `0` bug); `timeoutManager` custom-provider typing.
- `infiniteQueryBehavior` rejects cancelled page fetches with `context.signal.reason`.
- `queriesObserver` skips `combine` while a suspense query has no data.
- `Query.setState` no longer takes `SetStateOptions` (internal; unused by the adapter).

## Port scope

- Ported 1-1 from upstream: the entire headless core — cache/client/observers/mutations/infinite queries/hydration/managers/retryer/streamedQuery and all utility/type modules.
- In-house additions (no upstream counterpart): `src/domphy/` (`createQuery`/`createMutation`/`createInfiniteQuery`/`bindResult`, the Domphy adapter with per-key `RecordState` reactivity) and `src/global.ts` (tsup global build shim).
- Not ported: upstream's framework adapters (React/Vue/Solid/Svelte/Angular) — the Domphy adapter replaces them.

## Intentional deviations from upstream

**None.** All 23 vendored core files are byte-identical to the 5.103.2 tarball. Deviations, if ever needed, must be recorded here in a table like `packages/form/SOURCES.md`'s and re-applied on every re-sync.

## Verification

- `pnpm --filter @domphy/query test` — 57 tests across 4 files.
- `pnpm --filter @domphy/query build` — tsup.
