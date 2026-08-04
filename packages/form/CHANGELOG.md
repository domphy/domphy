# @domphy/form

## 0.18.2

- Vendored core rebased to `@tanstack/form-core` v1.33.3 (was v1.33.0): upstream `_pendingValidationsCount` isValidating-race fix, re-submission stale-error clearing, form-level errors for meta-less fields. Deviations #1–#3 re-applied (still needed upstream); new deviation #4: post-resolution abort guard in `FormApi.validateAsync`. Pin evidence + deviation table: `SOURCES.md`.

## 0.18.1

- Docs + tests: invalid submit calls `onSubmitInvalid` and does not call `onSubmit`; server errors via `formApi.setErrorMap` (throwing from `onSubmit` rethrows and does not invent `state.errors` — TanStack Form contract).

## 0.6.0

- Initial release: 1-1 port of @tanstack/form-core v1.33.0, plus a Domphy adapter (`createForm`) at the `@domphy/form/domphy` subpath.
