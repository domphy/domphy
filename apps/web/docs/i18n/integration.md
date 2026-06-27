---
title: "Integration Guide"
description: "Wire @domphy/i18n into a full app — router integration, locale detection, and locale switcher."
---

# Integration Guide

## App setup

Create the i18n instance once, then import `t`, `setLocale`, `getLocale`, and `initI18n` wherever needed:

```ts
// i18n.ts
import { createI18n } from "@domphy/i18n"
import en from "./locales/en.json"
import vi from "./locales/vi.json"

export type Locale = "en" | "vi"

export const i18n = createI18n<Locale, typeof en>({
  globalKey: "__myapp_i18n__",
  namespace: "app",
  locales: { en, vi },
  defaultLocale: "en",
})
```

In your app entry point:

```ts
import { i18n } from "./i18n"

await i18n.initI18n(i18n.detectLocale({ pathSegment: true, storageKey: "locale" }))
```

## Locale switcher component

```ts
import { i18n } from "./i18n"
import type { Locale } from "./i18n"

const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
]

const LocaleSwitcher = {
  div: [
    {
      select: LOCALES.map(({ code, label }) => ({
        option: label,
        value: code,
      })),
      value: (l) => i18n.locale.get(l),
      onChange: async (e: Event) => {
        const lng = (e.target as HTMLSelectElement).value as Locale
        await i18n.setLocale(lng)
        localStorage.setItem("locale", lng)
      },
      "aria-label": "Select language",
    },
  ],
}
```

## Router integration — locale from URL

Use `detectLocale` with `pathSegment: true` to read the locale from `/vi/...` URL prefixes:

```ts
import { i18n } from "./i18n"
import { createRouter } from "@domphy/router"

const router = createRouter({
  beforeLoad: async ({ pathname }) => {
    // Detect locale from /vi/... prefix
    const detected = i18n.detectLocale({ pathSegment: true, storageKey: "locale" })
    await i18n.initI18n(detected)
  },
})
```

## Using translations in elements

```ts
import { i18n } from "./i18n"

const { t } = i18n

const Header = {
  header: [
    {
      nav: [
        { a: (l) => t(l, "nav.home"), href: "/" },
        { a: (l) => t(l, "nav.about"), href: "/about" },
      ],
    },
    LocaleSwitcher,
  ],
}
```

`t(listener, key)` subscribes to locale changes — the element re-renders automatically when `setLocale()` is called.

## RTL support

Handle right-to-left languages (Arabic, Hebrew, Persian):

```ts
import { effect } from "@domphy/core"
import { i18n } from "./i18n"

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"])

effect(() => {
  const lng = i18n.locale.get()
  document.documentElement.setAttribute("dir", RTL_LANGUAGES.has(lng) ? "rtl" : "ltr")
  document.documentElement.setAttribute("lang", lng)
})
```

Domphy respects `dir` on the root element — CSS logical properties (`margin-inline-start`, `padding-inline`) flip automatically for RTL.
