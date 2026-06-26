---
title: "Integration Guide"
description: "Wire @domphy/i18n into a full app — router integration, lazy namespace loading, and locale detection."
---

# Integration Guide

## App setup

A complete `@domphy/i18n` setup involves three pieces: the i18n instance, a router hook that loads the right namespace for each route, and a locale switcher.

```ts
import i18next from "@domphy/i18n"
import { initReactI18next } from "i18next-react-dom"   // or native adapter

await i18next.init({
  lng: detectLocale(),          // see detectLocale() below
  fallbackLng: "en",
  ns: ["common"],               // always-loaded namespaces
  defaultNS: "common",
  resources: {
    en: {
      common: {
        "nav.home": "Home",
        "nav.about": "About",
        "actions.save": "Save",
        "actions.cancel": "Cancel",
      },
    },
    vi: {
      common: {
        "nav.home": "Trang chủ",
        "nav.about": "Về chúng tôi",
        "actions.save": "Lưu",
        "actions.cancel": "Hủy",
      },
    },
  },
})
```

## Locale detection

Auto-detect the user's preferred locale:

```ts
function detectLocale(): string {
  // 1. URL param (?lng=vi)
  const url = new URLSearchParams(window.location.search)
  const urlLng = url.get("lng")
  if (urlLng) return urlLng

  // 2. localStorage
  const stored = localStorage.getItem("lng")
  if (stored) return stored

  // 3. Browser preference
  const [browserLng] = navigator.language.split("-")
  return browserLng

  // 4. Fallback handled by i18next.init fallbackLng
}
```

## Reactive locale state

Expose the current locale as Domphy state so the UI updates when it changes:

```ts
import { toState } from "@domphy/core"
import i18next from "@domphy/i18n"

export const currentLocale = toState(i18next.language)

// Keep in sync when i18next changes locale
i18next.on("languageChanged", (lng) => {
  currentLocale.set(lng)
  localStorage.setItem("lng", lng)
})

export function t(key: string, options?: object): string {
  return i18next.t(key, options)
}
```

## Locale switcher component

```ts
const LOCALES = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "ja", label: "日本語" },
]

const LocaleSwitcher = {
  div: [
    {
      select: LOCALES.map(({ code, label }) => ({
        option: label,
        value: code,
      })),
      value: (l) => currentLocale.get(l),
      onChange: (e: Event) => {
        const lng = (e.target as HTMLSelectElement).value
        i18next.changeLanguage(lng)
      },
      "aria-label": "Select language",
    },
  ],
}
```

## Router integration — load namespaces per route

Load only the translations needed for the current route:

```ts
import { createRoute } from "@domphy/router"

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: async () => {
    // Load "admin" namespace before the route renders
    await i18next.loadNamespaces(["admin"])
  },
  component: () => ({
    div: [
      { h1: i18next.t("admin:dashboard.title") },
    ],
  }),
})
```

## Using translations in elements

```ts
import { computed } from "@domphy/core"

// Reactive translation — updates on locale change
const Header = {
  header: [
    {
      nav: [
        { a: (l) => i18next.t("nav.home"), href: "/" },
        { a: (l) => i18next.t("nav.about"), href: "/about" },
      ],
    },
    LocaleSwitcher,
  ],
}
```

Note: `i18next.t()` is synchronous but not reactive — wrap in a listener function `(l) => i18next.t(key)` and subscribe to `currentLocale` for auto-updates:

```ts
import { effect } from "@domphy/core"

// Force re-render on locale change by reading currentLocale in each listener
const PageTitle = {
  h1: (l) => {
    currentLocale.get(l)    // subscribe to locale changes
    return i18next.t("page.title")
  },
}
```

## TypeScript: typed translation keys

Use `i18next-typescript` plugin for typed keys:

```ts
// i18n.d.ts
import "i18next"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common"
    resources: {
      common: typeof import("./locales/en/common.json")
      admin: typeof import("./locales/en/admin.json")
    }
  }
}

// Now t() is typed:
i18next.t("nav.home")              // OK
i18next.t("nav.nonexistent")       // ✗ TypeScript error
i18next.t("admin:dashboard.title") // OK (with ns prefix)
```

## RTL support

Handle right-to-left languages (Arabic, Hebrew, Persian):

```ts
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"])

effect(() => {
  const lng = currentLocale.get()
  document.documentElement.setAttribute("dir", RTL_LANGUAGES.has(lng) ? "rtl" : "ltr")
  document.documentElement.setAttribute("lang", lng)
})
```

Domphy respects `dir` on the root element — CSS logical properties (`margin-inline-start`, `padding-inline`) automatically flip for RTL.
