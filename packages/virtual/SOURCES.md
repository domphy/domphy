# @domphy/virtual — Sources

`@domphy/virtual` is a byte-level port of [**@tanstack/virtual-core**](https://github.com/TanStack/virtual/tree/main/packages/virtual-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`). This file records which upstream version was ported, the evidence for that pin, the port's scope, and every intentional deviation from upstream.

## Upstream version

**Pinned: `@tanstack/virtual-core@3.17.7`** (npm). Originally ported from `3.17.0`; rebased to `3.17.7` on 2026-08-04 (audit `.stable-audit/19-virtual.md`) to pick up upstream fixes in the measurement/scroll-anchoring surfaces:

- spurious no-op scroll events (Safari/Firefox) no longer re-arm `isScrolling` — fixes an infinite re-render loop
- `gap` added to the `getMeasurementOptions` memo dependencies — changing `gap` via `setOptions` now rebuilds measurements
- anchor resolution clamps the tracked offset to `>= 0` (rubber-band / unscrollable element never self-healed, #1229)
- `resizeItem` distinguishes first-measure vs re-measure for above-fold compensation (#1218) and notifies synchronously when `scrollTop` was written in the same tick (#1227)
- iOS deferred-adjustment lifecycle fixes (#1233) and cleanup on scroll-element swap
- O(lanes) lane-argmin placement + monomorphic flat-array binary search (perf)

Evidence (direct, not inferred):

1. **Full-tree diff.** Every file under `src/` that has an upstream counterpart (`index.ts`, `lazy-measurements.ts`, `utils.ts`) is byte-identical to the `3.17.7` npm tarball (`https://registry.npmjs.org/@tanstack/virtual-core/-/virtual-core-3.17.7.tgz`), except for the deliberate deviation listed below. Verified 2026-08-04 by diffing all 3 files (`lazy-measurements.ts` and `utils.ts` are byte-identical with zero hunks; `index.ts` differs only by the deviation hunk). Reproduce with `npm pack @tanstack/virtual-core@3.17.7`.

## Port scope

- Ported 1-1 from upstream: the entire headless core — `Virtualizer` (element + window observers, dynamic measurement, scroll anchoring with `anchorTo`/`followOnAppend`, lanes/masonry, gap, RTL, iOS workarounds), `lazy-measurements`, `utils`.
- In-house additions (no upstream counterpart): `src/domphy/` (`createVirtualizer`, `createWindowVirtualizer` — the Domphy adapter with a reactive `State`-backed `version` counter) and `src/global.ts` (tsup global build shim).
- Not ported: upstream's framework adapters (React/Vue/Solid/Svelte/Angular/Lit) — the Domphy adapter replaces them.

## Intentional deviations from upstream

| File | Deviation | Reason |
|---|---|---|
| `src/index.ts` (`setOptions`) | A pure append (count grows, every existing item keeps its key at its index — detected by comparing first/last keys against the previous options) skips the O(n) anchor-key resolution and forced measurement rebuild; it only evaluates `followOnAppend`. | A pure append never shifts any existing item's start offset, so the current `scrollOffset` is already correct; upstream ran the full prepend/reorder anchoring path on *any* count change. Behavior on prepends/trims/reorders is unchanged (full anchor resolution still runs). Pinned by `tests/domphy-adapter.test.ts` ("anchorTo: 'end' pure-append fast path"). |

## Verification

- `pnpm --filter @domphy/virtual test` — 20 tests (adapter reactivity, cleanup/destroy hardening, pure-append deviation, `data-index` measurement contract, `setOptions` size-cache preservation, `createWindowVirtualizer`).
- `pnpm --filter @domphy/virtual build` — tsup.
