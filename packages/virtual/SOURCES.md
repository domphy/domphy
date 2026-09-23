# @domphy/virtual — Sources

`@domphy/virtual` is a byte-level port of [**@tanstack/virtual-core**](https://github.com/TanStack/virtual/tree/main/packages/virtual-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`). This file records which upstream version was ported, the evidence for that pin, the port's scope, and every intentional deviation from upstream.

## Upstream version

**Pinned: `@tanstack/virtual-core@3.17.11`** (npm). Ported from 3.17.0, rebased to 3.17.7 on 2026-08-04 (audit `.stable-audit/19-virtual.md`), resynced to 3.17.11 on 2026-09-23.

Evidence (direct, not inferred):

1. **Full-tree diff.** Every file under `src/` that has an upstream counterpart (`index.ts`, `utils.ts`, `lazy-measurements.ts`) is byte-identical to the `3.17.11` npm tarball (`https://registry.npmjs.org/@tanstack/virtual-core/-/virtual-core-3.17.11.tgz`). Verified 2026-09-23 by `diff -q` on all three files: **0 differing files**. The only non-upstream files under `src/` are `domphy/` (the adapter) and `global.ts` (tsup global build shim).
2. **Dependency signature.** Upstream virtual-core has zero runtime dependencies at 3.17.11; `@domphy/virtual` likewise has zero runtime dependencies.

### What the 3.17.7 -> 3.17.11 resync brought in

Before the resync `utils.ts` and `lazy-measurements.ts` were already byte-identical to 3.17.7 and `index.ts` carried exactly one deviation (the pure-append anchor fast path, two hunks in `setOptions`). Upstream 3.17.11 supersedes that deviation with a more general form — `isAppendWithTrim` also treats a *windowed* append (old items trimmed off the front while new ones land at the end) as an append for `followOnAppend`, and edge keys are read from the single-lane items buffer via `getMeasurementKey` instead of re-resolving them through `getItemKey` — so the resync **dropped the deviation** rather than re-applying it. Fixes the port did not have before:

- `debounce()` gained `.cancel()`, and `observeElementOffset`'s teardown now calls `fallback?.cancel()`. Removing the scroll listener never retracted the `isScrolling = false` reset the last scroll had already queued, so that call landed on a torn-down virtualizer. In Domphy that reaches `onChange` -> the adapter's disposed version `State` after `destroy()`. The queued reset also re-reads the element at fire time (`cb(readOffset(element), false)`) instead of replaying the offset captured when it was queued.
- `cleanup()` also resets `isScrolling` / `scrollDirection` (and the pending clamped adjustment). `cleanup` runs on a scroll-element swap and on `enabled: false`, where the instance lives on — a cleanup inside the reset window used to strand `isScrolling`, and the direction derived from it, as `true`.
- `isIndexInRange()` guards on the resize-observer callback, `measureElement` and `resizeItem`, so a stale `data-index` past the current `count` no longer writes a bogus size into the cache.
- `_clampedAdjustment` (#1258, #1266): a compensation write the browser clamped because the consumer's sizer had not grown yet is now re-issued from `_willUpdate` and after `notify` in `resizeItem`.
- Anchor sync is skipped while a smooth programmatic scroll is still travelling (writing `scrollTop` there cancels the browser animation, and Chromium drops a smooth request re-issued right after that cancel), and skipped when `followOnAppend` will handle the move.
- `lazy-measurements` stores each item's key in the measurements buffer at build time (`_flatMeasurements` -> `_singleLaneMeasurements { flat, items }`), so keys belong to the layout build rather than to the later read.

## Port scope

- Ported 1-1 from upstream: the entire headless core — `Virtualizer`, the element/window rect + offset observers, `elementScroll`/`windowScroll`, `measureElement`, range calculation, the lanes/masonry layout, the lazy single-lane measurement view, and the `memo`/`debounce`/`approxEqual` utilities.
- In-house additions (no upstream counterpart): `src/domphy/` (`createVirtualizer`, `createWindowVirtualizer` — reactive `State`-backed handles) and `src/global.ts` (tsup global build shim).
- Not ported: upstream's framework adapters (React/Vue/Solid/Svelte/Angular/Lit) — the Domphy adapter replaces them.

## Intentional deviations from upstream

**None.** All three vendored core files are byte-identical to the 3.17.11 tarball. Deviations, if ever needed, must be recorded here in a table like `packages/form/SOURCES.md`'s and re-applied on every re-sync.

## Verification

- `pnpm --filter @domphy/virtual test` — 20 tests across 3 files (adapter lifecycle/reactivity under jsdom, window virtualizer, element-syntax integration).
- `pnpm --filter @domphy/virtual build` — tsup (ESM + CJS + IIFE + d.ts).
