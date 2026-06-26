---
title: "Lazy Loading & Backend"
description: "Load translations on-demand, split by route, integrate with a backend API, and handle loading states."
---

# Lazy Loading & Backend

## Why lazy-load translations?

Shipping all translations upfront increases initial bundle size. Lazy loading splits translations by:
- **Locale** — load only the active locale
- **Namespace** — load only the translations needed for the current page/feature
- **Route** — load translations on navigation

## Locale-split with dynamic imports

Vite/Rollup tree-shakes dynamic `import()` with template literals:

```ts
import { createI18n } from "@domphy/i18n/domphy"

const { t, setLocale } = createI18n({
  locale: "en",
  messages: {
    en: () => import("./locales/en.json"),
    fr: () => import("./locales/fr.json"),
    de: () => import("./locales/de.json"),
    ja: () => import("./locales/ja.json"),
  },
})
```

Each locale is a separate chunk — only `en.json` downloads on first load. When the user switches to French, `fr.json` downloads and caches.

## Namespace lazy loading per route

Load translations when a route mounts — not before:

```ts
import { createI18n } from "@domphy/i18n/domphy"

const { t, loadNamespace } = createI18n({
  locale: "en",
  namespaces: {
    common: () => import("./locales/en/common.json"),
    // "dashboard" namespace not preloaded — loaded on demand
  },
})

// In the dashboard route loader:
const dashboardRoute = createRoute({
  path: "/dashboard",
  loader: async () => {
    await loadNamespace("dashboard", () => import("./locales/en/dashboard.json"))
  },
  component: () => DashboardPage,
})
```

## HTTP backend

Fetch translations from a server at runtime — useful for translations stored in a CMS or translation management system:

```ts
const { t } = createI18n({
  locale: "en",
  messages: {
    en: async () => {
      const response = await fetch("/api/translations/en")
      return response.json()
    },
    fr: async () => {
      const response = await fetch("/api/translations/fr")
      return response.json()
    },
  },
})
```

With a translation management service (Lokalise, Crowdin, Phrase):

```ts
const LOKALISE_CDN = "https://cdn.lokalise.com/my-project"

const { t } = createI18n({
  locale: navigator.language.split("-")[0] as Locale,
  messages: {
    en: () => fetch(`${LOKALISE_CDN}/en.json`).then(r => r.json()),
    fr: () => fetch(`${LOKALISE_CDN}/fr.json`).then(r => r.json()),
    de: () => fetch(`${LOKALISE_CDN}/de.json`).then(r => r.json()),
  },
})
```

## Handling the loading state

Translations load asynchronously — show a loading state while the initial locale loads:

```ts
import { toState } from "@domphy/core"

const translationsReady = toState(false)

async function initApp() {
  const { t } = createI18n({ locale: "en", messages: { en: () => import("./en.json") } })
  await initI18n()   // load the initial locale
  translationsReady.set(true)
}

initApp()

const App = {
  div: (l) => translationsReady.get(l) ? MainApp : { div: "Loading…" },
}
```

## Locale detection

Auto-detect locale from browser, user preference, or URL:

```ts
import { detectLocale } from "@domphy/i18n"

const supported: Locale[] = ["en", "fr", "de", "ja", "zh"]

function getInitialLocale(): Locale {
  // 1. Check URL param (?lang=fr)
  const urlParam = new URLSearchParams(location.search).get("lang")
  if (urlParam && supported.includes(urlParam as Locale)) return urlParam as Locale

  // 2. Check saved preference
  const saved = localStorage.getItem("locale")
  if (saved && supported.includes(saved as Locale)) return saved as Locale

  // 3. Browser language
  return detectLocale(navigator.languages, supported, "en") as Locale
}

const { t, setLocale } = createI18n({
  locale: getInitialLocale(),
  messages: { ... },
})
```

## Preloading on hover

Preload the translated page before the user navigates to it:

```ts
const NavLink = (href: string, label: string, namespace: string) => ({
  a: label,
  href,
  onMouseenter: async () => {
    await loadNamespace(namespace)
  },
})
```

## Caching loaded namespaces

Loaded namespaces are cached in memory — `loadNamespace("dashboard")` on re-navigation is instant:

```ts
// First call: fetches from network (~200ms)
await loadNamespace("dashboard", () => import("./locales/en/dashboard.json"))

// Subsequent calls: returns from memory cache (~0ms)
await loadNamespace("dashboard", () => import("./locales/en/dashboard.json"))
```

## SSR considerations

On the server, translations must be loaded synchronously (or pre-awaited):

```ts
// Server-side
import en from "./locales/en.json"   // static import — synchronous
import fr from "./locales/fr.json"

const MESSAGES = { en, fr }

const { t } = createI18n({
  locale: userLocale,
  messages: {
    en: () => Promise.resolve(MESSAGES.en),
    fr: () => Promise.resolve(MESSAGES.fr),
  },
})
```

With `@domphy/app` SSR, the server can read the `Accept-Language` header or cookie to choose the locale, then hydrate the client with the same locale.
