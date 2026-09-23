# @domphy/table — Sources

`@domphy/table` is a byte-level port of [**@tanstack/table-core**](https://github.com/TanStack/table/tree/main/packages/table-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`) and one Domphy-original feature (`src/features/CellEditing.ts`). This file records which upstream version was ported, the evidence for that pin, the port's scope, and every intentional deviation from upstream.

## Upstream version

**Pinned: `@tanstack/table-core@8.21.3`** (npm) — the newest release of the v8 line. Verified 2026-09-23.

Evidence (direct, not inferred):

1. **Full-tree diff.** Of the 37 files under `src/` that have an upstream counterpart in the `8.21.3` npm tarball (`https://registry.npmjs.org/@tanstack/table-core/-/table-core-8.21.3.tgz`), **29 are byte-identical**; the other 8 differ by exactly the deviation hunks below, nothing more. The non-upstream files are `domphy/createDomphyTable.ts`, `domphy/index.ts`, `features/CellEditing.ts` and `global.ts` (tsup global build shim). Reproduce with `npm pack @tanstack/table-core@8.21.3`.
2. **Dependency signature.** Upstream table-core has zero runtime dependencies at 8.21.3; `@domphy/table` likewise has zero runtime dependencies.

**Not tracking v9 (decided 2026-09-24).** Upstream has a `9.x` line (9.2.4 as of 2026-09-23): a rewrite with explicit per-feature registration via `tableFeatures({...})` (tree-shakable), a `@tanstack/store` state model replacing `getState()`/`onStateChange`, and renamed APIs across every feature. Moving to it breaks every `@domphy/table` consumer (packages/blocks table blocks + 22 docs/demo files) and is a separate migration project, not a resync. Within the v8 line this port is current (8.21.3).

## Port scope

- Ported 1-1 from upstream: the entire headless core — `createTable`, the row/column/cell/header models, all 15 built-in features, every row-model factory, and the built-in `sortingFns`/`filterFns`/`aggregationFns`.
- In-house additions (no upstream counterpart): `src/domphy/` (`createDomphyTable` — the reactive `State`-backed adapter), `src/features/CellEditing.ts` (opt-in, **not** in `builtInFeatures`), and `src/global.ts`.
- Not ported: upstream's framework adapters (React/Vue/Solid/Svelte/Angular/Lit/Qwik) — the Domphy adapter replaces them.

## Intentional deviations from upstream

| # | File | Deviation | Reason |
|---|---|---|---|
| 1 | `src/features/RowPinning.ts` (`getPinnedRows`) | Pinned rows are resolved through `getPrePaginationRowModel().rowsById` / `getCoreRowModel().rowsById` instead of `table.getRow(rowId, true)`, and a missing id yields `null` (filtered out) instead of throwing. The `keepPinnedRows: false` branch drops its non-null assertion for the same reason. | `getRow` throws `getRow(id) -> could not find row with id`. A pinned row that leaves the data (server refresh, delete) is an ordinary state, not a programmer error, and the throw took down every render that read the pinned rows. Regression: `tests/table.test.ts`. **Still present upstream in 8.21.3.** |
| 2 | `src/index.ts`, `src/types.ts` | `CellEditing` is exported and its `Instance`/`Options`/`TableState`/`Cell` interfaces are mixed into the feature interfaces — `CellEditingInstance` as `Partial<>`, since the feature is opt-in and its methods are absent until `_features: [CellEditing]` is passed. | Wiring for the Domphy-original feature. No upstream counterpart; no change to upstream behavior. |
| 3 | `src/core/headers.ts`, `src/features/RowSelection.ts`, `src/features/RowSorting.ts`, `src/utils/getCoreRowModel.ts`, `src/utils/getGroupedRowModel.ts` | Dead commented-out upstream code blocks removed (`addRowSelectionRange`, the placeholder-header filter, the grouped/non-grouped row bookkeeping, the `getRowId` assertion, the `toggleSorting` child recursion). | Whitespace/comment only — no statement was added, removed or reordered. Verified 2026-09-23: with `//` comments and blank lines stripped, all five files are identical to 8.21.3. |

## Verification

- `pnpm --filter @domphy/table test` — 79 tests across 5 files (core table suites, cell editing, adapter lifecycle/reactivity under jsdom).
- `pnpm --filter @domphy/table build` — tsup (ESM + CJS + IIFE + d.ts).
