# UPSTREAM.md — vendored floating-ui provenance

This package is a 1-1 vendor of [floating-ui](https://github.com/floating-ui/floating-ui)
(MIT © Floating UI contributors), bundled into a single zero-dependency package.

## Pinned upstream versions

Vendored from the floating-ui monorepo at tag `@floating-ui/dom@1.8.0`:

| Upstream package    | Version | Vendored to                 |
| ------------------- | ------- | --------------------------- |
| `@floating-ui/core` | 1.8.0   | `src/core/`                 |
| `@floating-ui/dom`  | 1.8.0   | `src/dom/`                  |
| `@floating-ui/utils`| 0.2.12  | `src/utils/`, `src/utils/dom.ts` |

Verified by a full recursive diff of `src/` against the upstream tag: every file
is byte-identical except the deviations listed below.

Sync history:

- 2026-08-04: 1.7.5/1.7.6/0.2.11 → 1.8.0/1.8.0/0.2.12. Absorbs upstream fixes
  relevant to Domphy overlays: `inline()` no-ops on empty client rects
  (hidden/detached references, collapsed ranges) and detects RTL-disjoined line
  rects; `size()` computes available size correctly for centered elements
  overflowing both sides; `autoUpdate` refreshes immediately (instead of waiting
  for the 1s throttle) when the reference moved during an observer refresh and
  rebuilds the layout-shift observer on root resize; `getClippingRect` filters
  clipping ancestors correctly for fixed-position elements; `platform.getClientRects`
  no longer throws for a virtual element without `getClientRects`; plus the new
  `'layoutViewport'` `rootBoundary` option. Pinned by new fixtures in
  `tests/middleware.test.ts` (size centered-overflow, inline empty-rects,
  RTL alignment) and `tests/floating.test.ts` (autoUpdate cleanup).
- Initial pin: core 1.7.5 / dom 1.7.6 / utils 0.2.11.

## Deviation list

The port tracks upstream byte-for-byte **except**:

1. **`src/dom/createFloating.ts` — domphy-only addition.** A stateful
   `computePosition` + `autoUpdate` manager (the Popper.js `createPopper()`
   equivalent) that does not exist upstream. `src/dom/index.ts` carries two
   extra export lines for it (`createFloating`, `FloatingHandle`,
   `FloatingPosition`).
2. **`src/dom/autoUpdate.ts` — `NodeJS.Timeout` → `ReturnType<typeof setTimeout>`.**
   Upstream types the `observeMove` timeout handle as `NodeJS.Timeout`; this
   package must type-check and build without `@types/node`, so the handle uses
   the browser-safe return type instead. Behavior is unchanged.
3. **Cross-package imports are resolved by alias, not `node_modules`.** Upstream
   imports `@floating-ui/core` / `@floating-ui/utils` across package
   boundaries; here `tsup.config.ts` (build) and `vitest.config.ts` (test) map
   those specifiers to the vendored `src/core` / `src/utils` files. The source
   text of the imports is unchanged — this is the vendoring mechanism, not a
   code deviation.

## Re-syncing with upstream

1. Download the upstream monorepo at the target tag, e.g.
   `https://codeload.github.com/floating-ui/floating-ui/tar.gz/refs/tags/@floating-ui/dom@<version>`.
2. `diff -r packages/core/src src/core`, `diff -r packages/dom/src src/dom`,
   `diff -r packages/utils/src src/utils` and confirm only the deviations
   above remain (re-apply deviation 2 after copying `autoUpdate.ts`).
3. Update the version table above and the middleware behavior fixtures in
   `tests/middleware.test.ts` if upstream behavior intentionally changed.
4. Run `pnpm --filter @domphy/floating test` and `pnpm --filter @domphy/floating build`.
