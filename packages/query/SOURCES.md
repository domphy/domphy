# @domphy/query — Sources

`@domphy/query` is a byte-level port of [**@tanstack/query-core**](https://github.com/TanStack/query/tree/main/packages/query-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`). This file records which upstream version was ported, the evidence for that pin, the port's scope, and every intentional deviation from upstream.

## Upstream version

**Pinned: `@tanstack/query-core@5.101.4`** (npm). Synced from 5.90.20 on 2026-08-04 (wave-3 deferral; see `.stable-audit/29-deferral-wave3-query-form-resync.md`).

Evidence (direct, not inferred):

1. **Full-tree diff.** Every file under `src/` that has an upstream counterpart (`environmentManager.ts`, `focusManager.ts`, `hydration.ts`, `index.ts`, `infiniteQueryBehavior.ts`, `infiniteQueryObserver.ts`, `mutation.ts`, `mutationCache.ts`, `mutationObserver.ts`, `notifyManager.ts`, `onlineManager.ts`, `queriesObserver.ts`, `query.ts`, `queryCache.ts`, `queryClient.ts`, `queryObserver.ts`, `removable.ts`, `retryer.ts`, `streamedQuery.ts`, `subscribable.ts`, `thenable.ts`, `timeoutManager.ts`, `types.ts`, `utils.ts`) is byte-identical to the `5.101.4` npm tarball (`https://registry.npmjs.org/@tanstack/query-core/-/query-core-5.101.4.tgz`). Verified 2026-08-04 by diffing all 24 files: **0 differing files**. The only non-upstream file under `src/` is `global.ts` (tsup global build shim).
2. **Dependency signature.** Upstream query-core has zero runtime dependencies at both 5.90.20 and 5.101.4; `@domphy/query` likewise has zero runtime dependencies.

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

**None.** All 24 vendored core files are byte-identical to the 5.101.4 tarball. Deviations, if ever needed, must be recorded here in a table like `packages/form/SOURCES.md`'s and re-applied on every re-sync.

## Verification

- `pnpm --filter @domphy/query test` — 51 tests across 4 files.
- `pnpm --filter @domphy/query build` — tsup.
