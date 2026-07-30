# @domphy/form — Sources

`@domphy/form` is a byte-level port of [**@tanstack/form-core**](https://github.com/TanStack/form/tree/main/packages/form-core) (MIT-licensed) plus a thin in-house Domphy adapter (`src/domphy/`). This file records which upstream version was ported, the evidence for that pin, the port's scope, and every intentional deviation from upstream.

## Upstream version

**Pinned: `@tanstack/form-core@1.33.0`** (npm, published 2026-05-28).

Evidence (direct, not inferred):

1. **Full-tree diff.** Every file under `src/` that has an upstream counterpart (`EventClient.ts`, `FieldApi.ts`, `FieldGroupApi.ts`, `FormApi.ts`, `FormGroupApi.ts`, `ValidationLogic.ts`, `formOptions.ts`, `index.ts`, `mergeForm.ts`, `metaHelper.ts`, `standardSchemaValidator.ts`, `transform.ts`, `types.ts`, `util-types.ts`, `utils.ts`) is byte-identical to the `1.33.0` npm tarball (`https://registry.npmjs.org/@tanstack/form-core/-/form-core-1.33.0.tgz`), except for the deliberate deviations listed below. Verified 2026-07-30 by diffing all 15 files against the 1.33.0 / 1.33.1 / 1.33.2 tarballs: 1.33.0 matches, 1.33.1+ does not (upstream changed `FieldApi.ts`, `FormApi.ts`, `FormGroupApi.ts`, `types.ts`, `metaHelper.ts` in 1.33.1).
2. **Dependency signature.** `package.json` pins `@tanstack/store ^0.11.0` + `@tanstack/pacer-lite ^0.1.1` + `@tanstack/devtools-event-client ^0.4.1` — the exact dependency set of upstream 1.33.0–1.33.2 (upstream 1.28.x–1.32.x used older `@tanstack/store` ranges).

## Port scope

- Ported 1-1 from upstream: the entire headless core — `FormApi`, `FieldApi`, `FormGroupApi`, `FieldGroupApi`, validation logic (`defaultValidationLogic`, `revalidateLogic`), Standard Schema support, `mergeForm`/`transform`, `metaHelper`, devtools `EventClient`, and all utility/type modules.
- In-house additions (no upstream counterpart): `src/domphy/` (`createForm`, the Domphy adapter with reactive `State`-backed accessors and a per-name field cache) and `src/global.ts` (tsup global build shim).
- Not ported: upstream's framework adapters (React/Vue/Angular/Solid/Lit) — the Domphy adapter replaces them.

Note: `FormGroupApi`/`FieldGroupApi` are **not** in-house — they are upstream files, byte-identical to 1.33.0. `FormGroupApi` was first introduced upstream in 1.33.0 (1.32.1 has `FieldGroupApi.ts` only), which independently corroborates the 1.33.0 pin.

## Intentional deviations from upstream

| File | Deviation | Reason |
|---|---|---|
| `src/metaHelper.ts` (`handleArrayMove`) | Removed a loop that re-pushes the `fromIndex..toIndex` range into `affectedFields`, duplicating what `getAffectedFields(field, fromIndex, 'move', toIndex)` already returns. | The duplicated keys made `shiftMeta` shift the range twice, corrupting item meta on `moveValue` (source meta landed at the wrong index, middle meta was emptied). Found by `tests/array-fields.test.ts`. |
| `src/FormApi.ts` (`fieldMetaDerived`) | The derived-store reuse fast path now also requires `Object.keys(prevVal).length` to match the current `fieldMetaBase` key count before returning `prevVal`. | The reuse count alone cannot detect key *removal* (e.g. `deleteField` during array remove/clear): every surviving key compares equal, so stale meta stayed readable for deleted fields via `getFieldMeta`. Found by `tests/array-fields.test.ts`. |
| `src/FormApi.ts` (`deleteField`) | `fieldMetaBase` is copied (`{ ...prev.fieldMetaBase }`) before deleting keys instead of mutating the previous state object in place. | In-place mutation of a previous store snapshot breaks immutability expectations for anything holding the old state (including the derived store's own `prevBaseStore` comparison). Same failing test as above. |
| `src/ValidationLogic.ts` | The three upstream `// TODO: Type this properly` spots are typed (`AnyFormValidators` alias + a `ValidatorFnKey` mapped type that excludes the `*DebounceMs` number options from the `fn` union). | Cleanup; no runtime behavior change, public API compatible. |
| `src/domphy/createForm.ts` | `field(name)` cache emits a dev-time `console.warn` when a cached field is re-requested with structurally different options (options are still ignored — behavior pinned by `tests/adapter-field-cache.test.ts`). | Makes the documented "first call wins" cache contract discoverable instead of silent. Adapter-only file; no upstream counterpart. |

Upstream bug reports for the two array-meta bugs (first two rows) were **not** filed as of 2026-07-30 — both are present verbatim in upstream `main`.

## Verification

- `pnpm --filter @domphy/form test` — 108 tests across 8 files (headless core suites + jsdom adapter lifecycle suite).
- `pnpm --filter @domphy/form build` — tsup.
