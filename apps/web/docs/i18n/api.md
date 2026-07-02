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
| `locales` | `Record<TLocale, Record<string, unknown>>` | Translation objects keyed by locale code |
| `defaultLocale` | `TLocale` | Fallback locale |
| `interpolation` | `{ escapeValue?: boolean }` (optional) | i18next interpolation options — `escapeValue` defaults to `true` (i18next's safe default); pass `false` to disable HTML escaping globally |

`TMessages` is a separately-supplied generic used only to type `t()`'s key argument (via `FlattenKeys<TMessages>`) — it isn't structurally checked against `locales`, so passing a `TMessages` shape that doesn't match your `locales` values won't be caught by TypeScript.

### Returns: I18nInstance

| Member | Signature | Description |
|---|---|---|
| `t` | `(key, opts?) → string` | Static translation |
| `t` | `(listener, key, opts?) → string` | Reactive translation — re-renders on `setLocale` |
| `locale` | `State<TLocale>` | Reactive locale state — read with `(l) => i18n.locale.get(l)` to bind UI |
| `currentLocale` | `(listener) → TLocale` | Reactive read of current locale code — sugar for `locale.get(listener)` |
| `exists` | `(key) → boolean` | Returns `true` if the key exists in the active locale's translations |
| `initI18n` | `(locale?) → Promise<void>` | Initialize i18next with the given locale (defaults to `defaultLocale`) |
| `setLocale` | `(locale) → Promise<void>` | Switch locale and trigger reactive re-renders |
| `getLocale` | `() → TLocale` | Get current locale (non-reactive) |
| `detectLocale` | `(opts?) → TLocale` | Detect locale from URL path prefix or localStorage |

## detectLocale options

```ts
detectLocale({
  storageKey?: string   // localStorage key to read persisted locale from
  pathSegment?: boolean // check first URL path segment (/vi/...) — default true
})
```

Priority order: URL path segment first, then `storageKey` (localStorage), then `defaultLocale`.

## currentLocale — reactive locale code

`currentLocale(listener)` is shorthand for `locale.get(listener)`. Use it wherever you need the active locale code as a reactive value:

```ts
const { currentLocale } = i18n

// Render locale-aware content reactively
const LocaleTag = {
  span: (l) => currentLocale(l).toUpperCase(),   // "EN" / "FR" / "VI"
}

// Pass locale to Intl APIs reactively
const Price = (amount: number) => ({
  span: (l) =>
    new Intl.NumberFormat(currentLocale(l), { style: "currency", currency: "USD" }).format(amount),
})
```

## exists — key presence check

`exists(key)` returns `true` if the key is present in the active locale's translation resource. Useful for conditional rendering when a translation may be optional:

```ts
const { t, exists } = i18n

// Only render a help tooltip if a key is defined
const MaybeHelp = exists("form.emailHelp")
  ? { span: t("form.emailHelp") }
  : null
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
