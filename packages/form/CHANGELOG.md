# @domphy/form

## 0.18.1

- Docs + tests: invalid submit calls `onSubmitInvalid` and does not call `onSubmit`; server errors via `formApi.setErrorMap` (throwing from `onSubmit` rethrows and does not invent `state.errors` — TanStack Form contract).

## 0.6.0

- Initial release: 1-1 port of @tanstack/form-core v1.33.0, plus a Domphy adapter (`createForm`) at the `@domphy/form/domphy` subpath.
