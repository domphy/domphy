# @domphy/router — Upstream

`@domphy/router` is a 1-1 port of [**@tanstack/router-core**](https://github.com/TanStack/router/tree/main/packages/router-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`, shipping from the main entry). This file records the pinned upstream version, the port's scope, every intentional deviation from upstream, and the re-sync procedure.

## Upstream version

**Pinned: `@tanstack/router-core@1.171.13`** (npm). Evidence: `CHANGELOG.md` ("Initial release: 1-1 port of @tanstack/router-core v1.171.13") and the dependency signature (`@tanstack/history`, `@tanstack/store`, `cookie-es`, `seroval` + `seroval-plugins`). The 2026-08-04 audit additionally verified the published `1.171.15` tarball ships the same unguarded `load()` catch as `1.171.13` (see deviation 1), so the deviations below are not fixed by a patch bump.

## Port scope

- Ported 1-1 from upstream: the entire headless core — route/route-tree definition, path matching/parsing (`path.ts`), history integration, `RouterCore` (`router.ts`), the match-loading pipeline (`load-matches.ts`), stores (`stores.ts`), redirects/not-found, SSR (`ssr/`), scroll restoration, search middleware, structural sharing, and all type machinery.
- In-house additions (no upstream counterpart): `src/domphy/` — the Domphy adapter (`createRouter`, `createRoute`, `createRootRoute`, `createRootRouteWithContext`, `createRouteMask`, `getRouteApi`) with a headless transitioner (`domphy/transitioner.ts`) replacing upstream's React `<Transitioner>`; `@tanstack/history` re-export; `src/global.ts` (tsup global build shim).
- Not ported: upstream's framework adapters (React/Solid) — the Domphy adapter replaces them.

## Intentional deviations from upstream

| File | Deviation | Reason |
|---|---|---|
| `src/router.ts` (`RouterCore.load()` catch, ~2455-2476 and ~2596-2633) | Captures `loadLocation` right after `beforeLoad()`; when `this.latestLocation !== loadLocation` the load is stale and the catch skips both redirect-following (`this.navigate(...)`) and the `statusCode`/`redirect` store writes. | A superseded navigation's late loader rejection otherwise followed stale redirects (hijacking the committed location) and recomputed/wrote router-level state from a dead navigation. Found and fixed by the 2026-08-04 audit (`.stable-audit/18-router.md`, finding #1); verified present verbatim in upstream `1.171.13` and `1.171.15`. Identity comparison is sync-safe: synchronous loader completions and same-location `invalidate()` reloads are unaffected, and the check is inert on the server (one load per request). Regression tests: `tests/navigation-race.test.ts` (stale-redirect hijack, redirect-store preservation, no-early-commit, no-clobber, param-change race). If upstream later fixes this race, re-align with their mechanism. |
| `src/load-matches.ts` (`MatchSupersededError`, `getMatchOrThrow`) | A newer navigation supersedes an in-flight load by deleting its pending match stores in `setPending()`; upstream relies on the implicit `TypeError` from dereferencing the non-null-asserted `getMatch(matchId)!` (returns `undefined`) to abort the stale continuation. The port throws an explicit `MatchSupersededError` (exported from the package root, with an `isMatchSupersededError` guard) from `getMatchOrThrow` at exactly the dereference sites in the load pipeline (`isBeforeLoadSsr`, `preBeforeLoadSetup`, `executeBeforeLoad`, `getLoaderContext`, `runLoader`, the background-reload continuation, and `loadRouteMatch`). Sites that legitimately tolerate a missing match (`shouldSkipLoader`, the `shouldSkipLoader` early return in `loadRouteMatch`, `executeHead`, the `handleLoader` catch, `parentMatch` in `isBeforeLoadSsr`, and the two silent `return getMatch(matchId)!` sites) are unchanged. | The implicit throw is load-bearing — it unwinds the stale `loadMatches` before head execution and `triggerOnReady`, so a naive null-guard causes a premature commit of the newer navigation (verified by the 2026-08-04 audit). The sentinel preserves the exact early-abort semantics: thrown at the same points, rethrown by `loadMatches`' rejection handling like any unhandled rejection, absorbed by the stale `RouterCore.load()` catch (which, per the row above, skips router-level state writes for stale loads), and logged-and-swallowed by `preloadRoute` exactly as the `TypeError` was. Only the error type/message changes. Regression tests: `tests/navigation-race.test.ts` ("MatchSupersededError sentinel" block — sentinel type observable via the `preloadRoute` log path, no premature commit, no unhandled rejection). |

## Re-sync procedure

1. Download the target upstream tarball (`https://registry.npmjs.org/@tanstack/router-core/-/router-core-<version>.tgz`) and diff its `src/` (or the repo's `packages/router-core/src` at the matching tag) against this package's `src/`, excluding `src/domphy/` and `src/global.ts`.
2. Every diff hunk must be either (a) an upstream change to adopt, or (b) one of the deviations listed above. Update the table when a hunk is neither, or when upstream's own fix makes a deviation obsolete (re-align instead of keeping a parallel mechanism).
3. Bump the pin in this file and `CHANGELOG.md`, then run `pnpm --filter @domphy/router test` (the `tests/navigation-race.test.ts` suite pins both deviations) and `pnpm --filter @domphy/router build`.

## Verification

- `pnpm --filter @domphy/router test` — 17 files, 648 tests (headless core suites + jsdom adapter/navigation-race suites).
- `pnpm --filter @domphy/router build` — tsup (ESM + CJS + DTS).
