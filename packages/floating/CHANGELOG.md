# @domphy/floating

## 0.18.5

- `createFloating`: a caller-supplied `platform` now extends the default DOM platform instead of replacing it, matching `computePosition`'s own `{...platform, ...options.platform}` merge. A one-method override (`{ isRTL }`) previously left `computePosition` without `getElementRects` and every positioning pass rejected.
- `createFloating`: `connect()` no longer runs its own positioning pass on top of the one `autoUpdate()` performs when it starts — every connect did the work twice.
- `vitest.config.ts`/`vite.demo.config.ts` now alias the internal `@floating-ui/core`/`@floating-ui/utils` names to their local `src` files (mirroring `tsconfig.json`'s own `paths`) instead of relying on Vite's dep-optimizer cache to have them pre-resolved from an earlier run — `pnpm test` on a clean cache failed to resolve every test file with "Failed to resolve import" / "Cannot find package", silently masked whenever a stale cache happened to still have it.
- Real-Chromium (Playwright) coverage added: `e2e/createFloating.spec.ts` drives `createFloating()` against a live demo page — real `getBoundingClientRect`-based positioning, `flip()` actually flipping near a viewport edge, and `autoUpdate` repositioning on an ancestor's scroll — none of which jsdom (`tests/createFloating.test.ts`) can exercise. Run with `pnpm --filter @domphy/floating test:e2e`.

## 0.18.4

- `files` includes `UPSTREAM.md`.
- Public entry tests import `platform` / `getOverflowAncestors` from `src/index`.
- Changelog/docs use the real handle names: `connect` / `disconnect` / `onUpdate` / `onError`.

## 0.18.3

- `createFloating` audit-fix pass; tests cover connect/disconnect/onUpdate/onError.

## 0.11.0

- Initial release: a 1-1 vendor of [floating-ui](https://github.com/floating-ui/floating-ui) (`@floating-ui/dom` + `@floating-ui/core` + `@floating-ui/utils`), bundled into a single zero-dependency package so `@domphy/ui` has no external runtime dependency. Same API as `@floating-ui/dom`.
