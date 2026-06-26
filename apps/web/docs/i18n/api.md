---
title: "API Reference"
description: "Full API reference for @domphy/i18n."
---

# API Reference

## createI18n

```ts
createI18n<TLocale extends string, TMessages>(options): I18nInstance
```

### Options

| Option | Type | Description |
|---|---|---|
| `globalKey` | `string` | Unique key on `globalThis` — deduplicates instance across Vite chunks |
| `namespace` | `string` | i18next resource namespace |
| `locales` | `Record<TLocale, TMessages>` | Translation objects keyed by locale code |
| `defaultLocale` | `TLocale` | Fallback locale |

### Returns: I18nInstance

| Member | Signature | Description |
|---|---|---|
| `t` | `(key, opts?) → string` | Static translation |
| `t` | `(listener, key, opts?) → string` | Reactive translation — re-renders on `setLocale` |
| `initI18n` | `(locale?) → Promise<void>` | Initialize i18next with the given locale (defaults to `defaultLocale`) |
| `setLocale` | `(locale) → Promise<void>` | Switch locale and trigger reactive re-renders |
| `getLocale` | `() → TLocale` | Get current locale |
| `detectLocale` | `(opts?) → TLocale` | Detect locale from URL prefix or `navigator.language` |

## detectLocale options

```ts
detectLocale({
  fromUrl?: boolean     // check URL prefix (/en/..., /vi/...)
  fromBrowser?: boolean // check navigator.language
})
```

## Type safety

Pass your translation object as a generic parameter to get fully typed keys:

```ts
const en = {
  nav: { home: "Home", about: "About" },
  button: { save: "Save", cancel: "Cancel" },
} as const

const { t } = createI18n<"en" | "fr", typeof en>({ ... })

t("nav.home")     // ✓
t("button.save")  // ✓
t("nav.missing")  // ✗ TypeScript error
```
