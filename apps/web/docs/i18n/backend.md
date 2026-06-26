---
title: "Lazy Loading & Backend"
description: "Load translations on-demand and handle loading states with @domphy/i18n."
---

# Lazy Loading & Backend

## How @domphy/i18n handles locales

`createI18n` takes a `locales` object with static translation data. The simplest approach is static imports — Vite/Rollup will include all locales in the bundle:

```ts
import { createI18n } from "@domphy/i18n"
import en from "./locales/en.json"
import fr from "./locales/fr.json"
import vi from "./locales/vi.json"

const i18n = createI18n<"en" | "fr" | "vi", typeof en>({
  globalKey: "__myapp_i18n__",
  namespace: "app",
  locales: { en, fr, vi },
  defaultLocale: "en",
})
```

## Locale-split with dynamic imports

To avoid bundling all locales upfront, load translations dynamically before calling `createI18n`:

```ts
import { createI18n } from "@domphy/i18n"

type Locale = "en" | "fr" | "vi"

async function createI18nLazy(initialLocale: Locale) {
  const [en, fr, vi] = await Promise.all([
    import("./locales/en.json"),
    import("./locales/fr.json"),
    import("./locales/vi.json"),
  ])

  const i18n = createI18n<Locale, typeof en.default>({
    globalKey: "__myapp_i18n__",
    namespace: "app",
    locales: { en: en.default, fr: fr.default, vi: vi.default },
    defaultLocale: "en",
  })

  await i18n.initI18n(initialLocale)
  return i18n
}
```

For truly on-demand loading (only active locale), fetch before init and defer others:

```ts
async function createI18nOnDemand(initialLocale: Locale) {
  // Only load the initial locale upfront
  const initialMessages = await import(`./locales/${initialLocale}.json`)

  // Load remaining locales lazily on setLocale
  const localeModules: Record<Locale, Record<string, unknown>> = {
    [initialLocale]: initialMessages.default,
  } as Record<Locale, Record<string, unknown>>

  const loaders: Record<Locale, () => Promise<Record<string, unknown>>> = {
    en: () => import("./locales/en.json").then(m => m.default),
    fr: () => import("./locales/fr.json").then(m => m.default),
    vi: () => import("./locales/vi.json").then(m => m.default),
  }

  // Pre-load remaining locales in background
  for (const locale of (["en", "fr", "vi"] as Locale[]).filter(l => l !== initialLocale)) {
    loaders[locale]().then(messages => { localeModules[locale] = messages })
  }

  return createI18n<Locale, typeof initialMessages.default>({
    globalKey: "__myapp_i18n__",
    namespace: "app",
    locales: localeModules as Record<Locale, typeof initialMessages.default>,
    defaultLocale: initialLocale,
  })
}
```

## HTTP backend

Fetch translations from a server at runtime:

```ts
const [enMessages, frMessages] = await Promise.all([
  fetch("/api/translations/en").then(r => r.json()),
  fetch("/api/translations/fr").then(r => r.json()),
])

const i18n = createI18n<"en" | "fr", typeof enMessages>({
  globalKey: "__myapp_i18n__",
  namespace: "app",
  locales: { en: enMessages, fr: frMessages },
  defaultLocale: "en",
})
```

## Handling the loading state

Show a loading state while translations are being fetched:

```ts
import { toState } from "@domphy/core"

const translationsReady = toState(false)

async function initApp() {
  const messages = await fetch("/api/translations/en").then(r => r.json())
  const i18n = createI18n({ globalKey: "__app__", namespace: "app", locales: { en: messages }, defaultLocale: "en" })
  await i18n.initI18n()
  translationsReady.set(true)
}

initApp()

const App = {
  div: (l) => translationsReady.get(l) ? MainApp : { div: "Loading…" },
}
```

## Locale detection

Use `detectLocale` to pick the initial locale:

```ts
const i18n = createI18n<"en" | "fr" | "vi", typeof en>({ ... })

// Detect from URL path (/vi/...) then localStorage, then default
const locale = i18n.detectLocale({ pathSegment: true, storageKey: "locale" })
await i18n.initI18n(locale)

// Save preference on switch
const { setLocale } = i18n
async function switchLocale(next: "en" | "fr" | "vi") {
  await setLocale(next)
  localStorage.setItem("locale", next)
}
```

## SSR considerations

On the server, use static imports — fetch is unavailable or requires a polyfill:

```ts
import en from "./locales/en.json"
import fr from "./locales/fr.json"

const i18n = createI18n<"en" | "fr", typeof en>({
  globalKey: "__app_ssr__",
  namespace: "app",
  locales: { en, fr },
  defaultLocale: "en",
})

// Initialize with the locale from Accept-Language or cookie
await i18n.initI18n(userLocale)
```
