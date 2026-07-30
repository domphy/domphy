# UPSTREAM.md — vendored floating-ui provenance

This package is a 1-1 vendor of [floating-ui](https://github.com/floating-ui/floating-ui)
(MIT © Floating UI contributors), bundled into a single zero-dependency package.

## Pinned upstream versions

Vendored from the floating-ui monorepo at tag `@floating-ui/dom@1.7.6`:

| Upstream package    | Version | Vendored to                 |
| ------------------- | ------- | --------------------------- |
| `@floating-ui/core` | 1.7.5   | `src/core/`                 |
| `@floating-ui/dom`  | 1.7.6   | `src/dom/`                  |
| `@floating-ui/utils`| 0.2.11  | `src/utils/`, `src/utils/dom.ts` |

Verified by a full recursive diff of `src/` against the upstream tag: every file
is byte-identical except the deviations listed below.

## Deviation list

The port tracks upstream byte-for-byte **except**:

1. **`src/dom/createFloating.ts` — domphy-only addition.** A stateful
   `computePosition` + `autoUpdate` manager (the Popper.js `createPopper()`
   equivalent) that does not exist upstream. `src/dom/index.ts` carries two
   extra export lines for it (`createFloating`, `FloatingHandle`,
   `FloatingPosition`).
2. **`src/dom/autoUpdate.ts:47` — `NodeJS.Timeout` → `ReturnType<typeof setTimeout>`.**
   Upstream types the `observeMove` timeout handle as `NodeJS.Timeout`; this
   package must type-check and build without `@types/node`, so the handle uses
   the browser-safe return type instead. Behavior is unchanged.
3. **Cross-package imports are resolved by alias, not `node_modules`.** Upstream
   imports `@floating-ui/core` / `@floating-ui/utils` across package
   boundaries; here `tsup.config.ts` (build) and `vitest.config.ts` (test) map
   those specifiers to the vendored `src/core` / `src/utils` files. The source
   text of the imports is unchanged — this is the vendoring mechanism, not a
   code deviation.

### Explicitly *not* a deviation

`src/dom/autoUpdate.ts:150` types the `floating` parameter as
`FloatingElement | null`. This is sometimes assumed to be a local widening —
it is not: upstream `@floating-ui/dom@1.7.6` has the identical signature (the
widening landed upstream between 1.7.4 and 1.7.5). The file is byte-identical
to upstream apart from deviation 2 above.

## Re-syncing with upstream

1. Download the upstream monorepo at the target tag, e.g.
   `https://codeload.github.com/floating-ui/floating-ui/tar.gz/refs/tags/@floating-ui/dom@<version>`.
2. `diff -r packages/core/src src/core`, `diff -r packages/dom/src src/dom`,
   `diff -r packages/utils/src src/utils` and confirm only the deviations
   above remain (re-apply deviation 2 after copying `autoUpdate.ts`).
3. Update the version table above and the middleware behavior fixtures in
   `tests/middleware.test.ts` if upstream behavior intentionally changed.
4. Run `pnpm --filter @domphy/floating test` and `pnpm --filter @domphy/floating build`.
