# @domphy/i18n Changelog

## 0.19.3

- SSR: `initI18n` / `setLocale` no longer mutate the shared `globalThis` store locale. Request locale is isolated via `AsyncLocalStorage` so two concurrent `initI18n("en")` and `initI18n("vi")` calls do not clobber each other. Client `globalThis` dedup is unchanged.
- `runWithI18n(fn)` — fresh request-locale scope for SSR tests/frameworks that do not already have a per-request async context.

## 0.19.2

- Reactive `t(listener, key)` overload re-renders on `setLocale()`.
- globalThis singleton survives Vite chunk splitting.
- Concurrent `initI18n` / `setLocale` race fixed.
- Package description encoding fixed for npm metadata.

## 0.19.0

- Initial public release wrapping i18next.
