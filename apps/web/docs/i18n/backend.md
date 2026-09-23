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

## On-demand with `addLocale`

Ship one locale in the initial bundle and load the rest only when they are asked for. `locales` is snapshotted when `createI18n` runs — assigning more keys onto that object afterwards registers nothing with i18next — so a later locale goes in through `addLocale`, which wraps i18next's `addResourceBundle`:

```ts
import { createI18n } from "@domphy/i18n"
import en from "./locales/en.json"

type Locale = "en" | "fr" | "vi"

const i18n = createI18n<Locale, typeof en>({
  globalKey: "__myapp_i18n__",
  namespace: "app",
  locales: { en } as Record<Locale, typeof en>,
  defaultLocale: "en",
})

const loaded = new Set<Locale>(["en"])

export async function switchLocale(locale: Locale) {
  if (!loaded.has(locale)) {
    const messages = await import(`./locales/${locale}.json`)
    await i18n.addLocale(locale, messages.default)
    loaded.add(locale)
  }
  await i18n.setLocale(locale)
}
```

`addLocale` initializes i18next first if it hasn't been yet, so it is safe to call before `initI18n`. It deep-merges into whatever the locale already has and overwrites the keys it repeats, so a partial placeholder bundle can be filled in later. Once it resolves, the locale is usable by `t`, `setLocale`, `getLocale`, `exists` and `detectLocale`.

It also re-renders mounted `t(listener, key)` readers, which `setLocale` alone cannot always do: after `initI18n("fr")` with `fr` not yet loaded, i18next is *already* on `fr` (serving the fallback), so `setLocale("fr")` short-circuits and the locale state never changes. Filling in a partial bundle for the locale already on screen doesn't change the locale code at all. Both re-render.

Declare the full `Locale` union up front — only the *data* is deferred, not the set of codes the app knows about.

A locale the user's browser asks for at startup can also be the *only* one in the first `locales` object, with `addLocale` filling in the rest as they are chosen:

```ts
async function createI18nOnDemand(initialLocale: Locale) {
  const initialMessages = await import(`./locales/${initialLocale}.json`)

  const i18n = createI18n<Locale, typeof initialMessages.default>({
    globalKey: "__myapp_i18n__",
    namespace: "app",
    locales: {
      [initialLocale]: initialMessages.default,
    } as Record<Locale, typeof initialMessages.default>,
    defaultLocale: initialLocale,
  })

  await i18n.initI18n(initialLocale)
  return i18n
}
```

Do **not** reach for a second `createI18n` with a fresh `globalKey` to add a locale: a reuse of the same key keeps the first store and ignores the new `locales`, and a distinct key gives you two unrelated instances whose reactive `locale` states never agree. `addLocale` is the supported path.

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

On the server, use static imports — fetch is unavailable or requires a polyfill. `initI18n` / `setLocale` do **not** change the shared `globalThis` store's language: the request locale lives in `AsyncLocalStorage`, so two concurrent requests can call `initI18n("en")` and `initI18n("vi")` without clobbering each other. `t()`, `getLocale()`, `currentLocale()`, `exists()`, and `locale.get()` read the request locale when one is bound.

Node HTTP already gives each request its own async context. Elsewhere (tests, some frameworks) wrap the request with `runWithI18n()`:

```ts
import en from "./locales/en.json"
import fr from "./locales/fr.json"
import { createI18n, runWithI18n } from "@domphy/i18n"

const i18n = createI18n<"en" | "fr", typeof en>({
  globalKey: "__app_ssr__",
  namespace: "app",
  locales: { en, fr },
  defaultLocale: "en",
})

await runWithI18n(async () => {
  await i18n.initI18n(userLocale)
  return renderToString(App)
})
```

On the client, `globalThis[globalKey]` still dedups the instance across Vite chunks.
