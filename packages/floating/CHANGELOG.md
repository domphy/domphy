# @domphy/floating

## 0.18.4

- `files` includes `UPSTREAM.md`.
- Public entry tests import `platform` / `getOverflowAncestors` from `src/index`.
- Changelog/docs use the real handle names: `connect` / `disconnect` / `onUpdate` / `onError`.

## 0.18.3

- `createFloating` audit-fix pass; tests cover connect/disconnect/onUpdate/onError.

## 0.11.0

- Initial release: a 1-1 vendor of [floating-ui](https://github.com/floating-ui/floating-ui) (`@floating-ui/dom` + `@floating-ui/core` + `@floating-ui/utils`), bundled into a single zero-dependency package so `@domphy/ui` has no external runtime dependency. Same API as `@floating-ui/dom`.
