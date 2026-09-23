# @domphy/form — Sources

`@domphy/form` is a byte-level port of [**@tanstack/form-core**](https://github.com/TanStack/form/tree/main/packages/form-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`). This file records which upstream version was ported, the evidence for that pin, the port's scope, and every intentional deviation from upstream.

## Upstream version

**Pinned: `@tanstack/form-core@1.33.5`** (npm). Rebased 1.33.0 → 1.33.3 on 2026-08-04 (wave-3 deferral; see `.stable-audit/29-deferral-wave3-query-form-resync.md`), then 1.33.3 → 1.33.5 on 2026-09-23.

Evidence (direct, not inferred):

1. **Full-tree diff.** Every file under `src/` that has an upstream counterpart (`EventClient.ts`, `FieldApi.ts`, `FieldGroupApi.ts`, `FormApi.ts`, `FormGroupApi.ts`, `ValidationLogic.ts`, `formOptions.ts`, `index.ts`, `mergeForm.ts`, `metaHelper.ts`, `standardSchemaValidator.ts`, `transform.ts`, `types.ts`, `util-types.ts`, `utils.ts`) is byte-identical to the `1.33.5` npm tarball (`https://registry.npmjs.org/@tanstack/form-core/-/form-core-1.33.5.tgz`), except for the deliberate deviations listed below. Verified 2026-09-23: 12/15 files byte-identical; `metaHelper.ts` / `FormApi.ts` / `ValidationLogic.ts` differ by exactly the deviation hunks below, nothing more.
2. **Dependency signature.** `package.json` pins `@tanstack/store ^0.11.0` + `@tanstack/pacer-lite ^0.1.1` + `@tanstack/devtools-event-client ^0.4.1` — the exact dependency set of upstream 1.33.0–1.33.5.

What the 1.33.0 → 1.33.3 rebase brought in (all upstream bug fixes, no breaking changes for this port): the `_pendingValidationsCount` counter fixing the async `isValidating` race on concurrent field validations (with batched linked-field updates), re-submission re-running `validateAllFields` to clear stale non-submit errors, form-level validator errors surfacing for fields without meta (`prev = defaultFieldMeta` guards in `FormApi`/`FormGroupApi`), and type-level fixes (`FormListenersProps*` exported, `StandardSchemaV1` conditional-type ordering).

The 1.33.3 → 1.33.5 rebase touched exactly one file (`FormApi.ts`, one hunk): upstream adopted the `deleteField` path-boundary fix this port had carried as deviation #7 since 2026-07. The port now uses upstream's own spelling (`f.startsWith(`${fieldStr}.`) || f.startsWith(`${fieldStr}[`)`), which is semantically identical to the local `isFieldInGroup` form, so **deviation #7 is retired** and that hunk is byte-identical again. Its regression tests stay.

## Port scope

- Ported 1-1 from upstream: the entire headless core — `FormApi`, `FieldApi`, `FormGroupApi`, `FieldGroupApi`, validation logic (`defaultValidationLogic`, `revalidateLogic`), Standard Schema support, `mergeForm`/`transform`, `metaHelper`, devtools `EventClient`, and all utility/type modules.
- In-house additions (no upstream counterpart): `src/domphy/` (`createForm`, the Domphy adapter with reactive `State`-backed accessors and a per-name field cache) and `src/global.ts` (tsup global build shim).
- Not ported: upstream's framework adapters (React/Vue/Angular/Solid/Lit) — the Domphy adapter replaces them.

Note: `FormGroupApi`/`FieldGroupApi` are **not** in-house — they are upstream files, byte-identical to 1.33.5.

## Intentional deviations from upstream

| # | File | Deviation | Reason |
|---|---|---|---|
| 1 | `src/metaHelper.ts` (`handleArrayMove`) | Removed a loop that re-pushes the `fromIndex..toIndex` range into `affectedFields`, duplicating what `getAffectedFields(field, fromIndex, 'move', toIndex)` already returns. | The duplicated keys made `shiftMeta` shift the range twice, corrupting item meta on `moveValue` (source meta landed at the wrong index, middle meta was emptied). Found by `tests/array-fields.test.ts`. **Still present upstream in 1.33.5** (verified 2026-09-23) — re-applied at each rebase. |
| 2 | `src/FormApi.ts` (`fieldMetaDerived`) | The derived-store reuse fast path now also requires `Object.keys(prevVal).length` to match the current `fieldMetaBase` key count before returning `prevVal`. | The reuse count alone cannot detect key *removal* (e.g. `deleteField` during array remove/clear): every surviving key compares equal, so stale meta stayed readable for deleted fields via `getFieldMeta`. Found by `tests/array-fields.test.ts`. **Still present upstream in 1.33.5** — re-applied at each rebase. |
| 3 | `src/FormApi.ts` (`deleteField`) | `fieldMetaBase` is copied (`{ ...prev.fieldMetaBase }`) before deleting keys instead of mutating the previous state object in place. | In-place mutation of a previous store snapshot breaks immutability expectations for anything holding the old state (including the derived store's own `prevBaseStore` comparison). Same failing test as above. **Still present upstream in 1.33.5** — re-applied at each rebase. |
| 4 | `src/FormApi.ts` (`validateAsync`) | Added the post-resolution abort guard `if (controller.signal.aborted) return resolve(undefined)` after the validator promise settles, mirroring the guard `FieldApi.validateAsync` already has (`FieldApi.ts`). | `validateAsync` aborts the superseded run's controller but never re-checks the signal after the validator resolves: with out-of-order completion (fresh run resolves first, cancelled stale run resolves last) the stale result was written to the form errorMap and stuck, even though the run was aborted and the current value is valid. Found by wave-1 adapter tests (`.stable-audit/29-deferral-wave1-query-form.md`, deviation candidate #4); **still present upstream in 1.33.5** (only the pre-run guard exists in the npm tarball). Regression test: `tests/adapter-async-submit.test.ts` ("deviation #4 regression"). |
| 5 | `src/ValidationLogic.ts` | The three upstream `// TODO: Type this properly` spots are typed (`AnyFormValidators` alias + a `ValidatorFnKey` mapped type that excludes the `*DebounceMs` number options from the `fn` union). | Cleanup; no runtime behavior change, public API compatible. |
| 6 | `src/domphy/createForm.ts` | `field(name)` cache emits a dev-time `console.warn` when a cached field is re-requested with structurally different options (options are still ignored — behavior pinned by `tests/adapter-field-cache.test.ts`). | Makes the documented "first call wins" cache contract discoverable instead of silent. Adapter-only file; no upstream counterpart. |
| 8 | `src/FormApi.ts` (`_handleSubmit`) | Early-return when `state.isSubmitting` is already true (devtools override still bypasses). | `!canSubmit` only early-returns when `submissionAttempts <= 1`. An overlapping `handleSubmit` while the first run is in flight increments attempts to 2, skips that return, and calls `onSubmit` again. Sequential re-submit after the previous run finishes is unchanged (stale-error revalidation). Regression: `tests/adapter-async-submit.test.ts` ("a second overlapping handleSubmit does not run onSubmit"). **Still present upstream in 1.33.5.** |

Deviation numbers are stable: **#7 is retired** (upstream adopted it in 1.33.5), so the live list is #1–#6 and #8.

Upstream bug reports for the two array-meta bugs (deviations #1–#3) were **not** filed as of 2026-07-30 and the bugs are still unfixed in 1.33.5 (verified 2026-09-23). Deviation #4 is likewise unfiled.

## Verification

- `pnpm --filter @domphy/form test` — 125 tests across 9 files (headless core suites + jsdom adapter lifecycle suite), including the flipped re-submission test, the deviation #4 regression test, `deleteField` path-boundary tests (formerly deviation #7, now upstream behavior), and the overlapping-submit guard (deviation #8).
- `pnpm --filter @domphy/form build` — tsup.
