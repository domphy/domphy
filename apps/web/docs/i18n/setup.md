---
title: "Setup"
description: "Full configuration and usage guide for @domphy/i18n."
---

# Setup

## createI18n options

```ts
import { createI18n } from "@domphy/i18n"

const en = {
  greeting: "Hello, {{name}}!",
  items_one: "{{count}} item",
  items_other: "{{count}} items",
} as const

const i18n = createI18n<"en" | "fr" | "vi", typeof en>({
  /** Unique key on globalThis — must differ per app to avoid cross-app collision. */
  globalKey: "__myapp_i18n__",
  /** i18next resource namespace. */
  namespace: "app",
  /** Translation objects keyed by locale code. */
  locales: {
    en,
    fr: { greeting: "Bonjour, {{name}}!", items_one: "{{count}} article", items_other: "{{count}} articles" },
    vi: { greeting: "Xin chào, {{name}}!", items_one: "{{count}} mục", items_other: "{{count}} mục" },
  },
  /** Locale used before initI18n() is called. */
  defaultLocale: "en",
})

await i18n.initI18n()
```

## Reactive translation

Pass a `listener` to re-render when the locale changes:

```ts
const { t } = i18n

const Header = {
  h1: (l) => t(l, "greeting", { name: "World" }),
}
```

When no listener is needed (outside reactive context):

```ts
const label = t("greeting", { name: "World" })
```

## Locale switching

```ts
const { setLocale, getLocale } = i18n

// Switch locale — all reactive t(l, ...) re-render automatically
await setLocale("vi")

// Read current locale
console.log(getLocale()) // "vi"
```

## Locale detection

`detectLocale` reads from the URL path segment or localStorage and returns the best matching locale:

```ts
const { detectLocale, initI18n } = i18n

await initI18n(detectLocale({ pathSegment: true, storageKey: "locale" }))
```

## globalThis dedup

`createI18n` registers the i18next instance on `globalThis[globalKey]`. This ensures a single instance across Vite code-split chunks and SSR + client hydration — multiple calls with the same `globalKey` return the same instance.

## i18next plugin integration

The underlying i18next instance is created internally. To add plugins (HTTP backend, language detector, etc.) use i18next directly alongside the wrapper, or access the exported `i18n` type for integration:

```ts
import { createInstance } from "i18next"
import HttpBackend from "i18next-http-backend"

// For advanced use cases, create a pre-configured instance and pass locale messages:
const resources = {
  en: { app: { greeting: "Hello!" } },
  vi: { app: { greeting: "Xin chào!" } },
}

// @domphy/i18n bundles the messages at createI18n time — for HTTP-loaded messages,
// fetch them before calling createI18n and pass the resolved objects in locales.
```
