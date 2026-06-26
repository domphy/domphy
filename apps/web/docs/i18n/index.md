---
title: "@domphy/i18n"
description: "Internationalization for Domphy — reactive i18next wrapper with Domphy reactivity."
---

# @domphy/i18n

A thin reactive wrapper around [i18next](https://www.i18next.com/). When the locale changes, any UI element that called `t(listener, key)` re-renders automatically.

## Installation

```bash
npm install @domphy/i18n i18next
```

## Quick start

```ts
import { createI18n } from "@domphy/i18n"

const en = { hello: "Hello, {{name}}!", save: "Save" } as const

const { t, setLocale, getLocale, initI18n } = createI18n<"en" | "vi", typeof en>({
  globalKey: "__myapp_i18n__",  // must be unique per app
  namespace: "app",
  locales: {
    en,
    vi: { hello: "Xin chào, {{name}}!", save: "Lưu" },
  },
  defaultLocale: "en",
})

await initI18n()
```

## Reactive usage

```ts
// Reactive — re-renders when setLocale() is called
const Greeting = {
  p: (l) => t(l, "hello", { name: "World" }),
}

// Non-reactive (outside element tree)
const label = t("save")
```

## Locale switching

```ts
// Switch locale — all reactive t(l, ...) re-render automatically
await setLocale("vi")

console.log(getLocale()) // "vi"
```

## detectLocale

```ts
const { detectLocale } = i18n

// Auto-detect from URL prefix (/vi/...) or Accept-Language header
const detected = detectLocale({ pathSegment: true })
await initI18n(detected)
```

## globalThis dedup

Registers the instance under `globalKey` on `globalThis` — ensures a single instance across Vite code-split chunks and SSR + client hydration.

See the [Setup guide](./setup.md) for full options reference.
