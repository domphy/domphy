# @domphy/form

## 0.18.4

- Vendored core resynced to `@tanstack/form-core@1.33.5` (from 1.33.3). Upstream adopted the `deleteField` path-boundary fix this port carried as deviation #7, so that hunk is byte-identical again and the deviation is retired; no behavior change (the two spellings are equivalent).
- `createForm`'s field-cache dev warning no longer reads `process.env` unguarded. In an unbundled browser context (native ESM from a CDN) the second `form.field(name, opts)` call threw `ReferenceError: process is not defined`; it now uses the same `typeof process` guard as the query/virtual adapters.
- `dist/form.global.js` iife build inlines `process.env.NODE_ENV`, matching the other data packages.

## 0.18.3

- Adapter `FormHandle.field` types `name` as `DeepKeys<TFormData>` and `options` as `FieldOptions` (minus `name`), matching `FormApi`. Unknown paths and a mismatched value generic (`form.field<number>("email")` when `email` is `string`) are now type errors. `getFieldValue` / `setFieldValue` / `validateField` use the same `DeepKeys` contract.

## 0.18.2

- Vendored core rebased to `@tanstack/form-core` v1.33.3 (was v1.33.0): upstream `_pendingValidationsCount` isValidating-race fix, re-submission stale-error clearing, form-level errors for meta-less fields. Deviations #1–#3 re-applied (still needed upstream); new deviation #4: post-resolution abort guard in `FormApi.validateAsync`. Pin evidence + deviation table: `SOURCES.md`.

## 0.18.1

- Docs + tests: invalid submit calls `onSubmitInvalid` and does not call `onSubmit`; server errors via `formApi.setErrorMap` (throwing from `onSubmit` rethrows and does not invent `state.errors` — TanStack Form contract).

## 0.6.0

- Initial release: 1-1 port of @tanstack/form-core v1.33.0, plus a Domphy adapter (`createForm`) at the `@domphy/form/domphy` subpath.
