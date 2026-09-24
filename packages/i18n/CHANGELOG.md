# @domphy/i18n Changelog

## 0.20.1

- Republish of 0.20.0 with no code change: the 0.20.0 tarball was published with raw `workspace:` dependency specifiers (published with `npm publish` instead of `pnpm publish`), so it could not be installed outside this monorepo. 0.20.0 is deprecated on npm.

## 0.20.0

- **BREAKING: `interpolation.escapeValue` now defaults to `false`.** Domphy is the escaping boundary — a string child is always rendered as TEXT and SSR escapes it — so i18next escaping on top rendered entity source (`O&#39;Brien`, `1&#x2F;2&#x2F;2026`) on screen instead of the real character. Same default react-i18next ships (React also escapes at render). Pass `true` when a translation is handed to something other than Domphy that parses HTML (`rawHtml()`, third-party `innerHTML`). The store-fingerprint mismatch warning now includes `escapeValue`, so two `createI18n()` calls sharing a `globalKey` with opposite postures still warn instead of silently sharing a store.
- **feat:** new `addLocale(locale, messages)` — register a locale's messages after `createI18n`, for `await import()`-ed locale bundles. Deep-merges, overwrites repeated keys, initializes i18next first if needed, re-renders mounted `t(listener, key)` readers even when the locale code itself does not change, and shares added locales across instances on the same `globalKey`.
- Plural base keys (`t("item", { count: 2 })`) are now in the typed key union via new `WithPluralBase<K>`, which adds the base key when a leaf ends in an i18next v4 plural suffix (`_zero/_one/_two/_few/_many/_other`). Runtime was always correct; this was type-level only.
- Dependency: `i18next` moved to `^26.3.6` (from `^25.0.0`), the security-fixed line (deepExtend prototype-chain recursion DoS, interpolation `skipOnVariables`/`escapeValue` variable-leak fix, log-forging/ReDoS/nesting hardening, cross-instance memory-leak fix). The removed `initImmediate` option is now `initAsync` (the v24 rename, accepted by both majors).

## 0.19.5

- `exists(key)` is active-locale-only: calls i18next with `{ lng: active, fallbackLng: false }` so a fallback-only key is false.

## 0.19.4

- detectLocale / SSR isolation audit-fix pass on top of the 0.19.3 ALS work.

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
