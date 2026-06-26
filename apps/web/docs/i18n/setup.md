---
title: "Setup"
description: "Full configuration and usage guide for @domphy/i18n."
---

# Setup

## createI18n options

```ts
import { createI18n } from "@domphy/i18n"
import i18next from "i18next"

const i18n = createI18n({
  /** i18next instance to use. Always pass your own configured instance. */
  instance: i18next,
  /** Supported locale codes. */
  locales: ["en", "fr", "vi"],
  /** Fallback locale if detection fails. */
  defaultLocale: "en",
  /** Message resources keyed by locale then key. */
  messages: {
    en: { greeting: "Hello, {{name}}!", items_one: "{{count}} item", items_other: "{{count}} items" },
    fr: { greeting: "Bonjour, {{name}}!" },
    vi: { greeting: "Xin chào, {{name}}!" },
  },
  /** Optional: detect locale from browser/URL. Defaults to navigator.language. */
  detectLocale: () => localStorage.getItem("lang") ?? navigator.language,
})
```

## Reactive translation

Pass a `listener` to re-render when the locale changes:

```ts
const { t } = i18n

const Header = {
  h1: (l) => t(l, "greeting", { name: "World" }),
}
```

When no listener is needed (e.g. outside reactive context):

```ts
const label = t(null, "greeting", { name: "World" })
```

## Locale switching

```ts
const { setLocale, getLocale } = i18n

// Switch locale — all reactive t(l, ...) re-render automatically
setLocale("vi")

// Read current locale
console.log(getLocale()) // "vi"
```

## Locale detection

```ts
const { detectLocale, initI18n } = i18n

// initI18n runs detectLocale + initializes the i18next instance
await initI18n()
```

## globalThis dedup

`createI18n` registers the i18next instance on `globalThis` under a unique key derived from the locale list. This ensures a single instance even when Vite splits the module across chunks — important for SSR + client hydration consistency.

## i18next integration

`@domphy/i18n` wraps any i18next instance — bring your own plugins (HTTP backend, language detector, pluralisation, etc.):

```ts
import i18next from "i18next"
import HttpBackend from "i18next-http-backend"

await i18next.use(HttpBackend).init({
  lng: "en",
  backend: { loadPath: "/locales/{{lng}}.json" },
})

const { t } = createI18n({ instance: i18next, locales: ["en", "fr"], defaultLocale: "en", messages: {} })
```
