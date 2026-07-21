# @domphy/i18n Changelog

## 0.19.2

- Reactive `t(listener, key)` overload re-renders on `setLocale()`.
- globalThis singleton survives Vite chunk splitting.
- Concurrent `initI18n` / `setLocale` race fixed.
- Package description encoding fixed for npm metadata.

## 0.19.0

- Initial public release wrapping i18next.
