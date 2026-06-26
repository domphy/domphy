---
title: "Namespaces"
description: "Using the @domphy/i18n namespace option and splitting translations by feature."
---

# Namespaces

## Single namespace

`@domphy/i18n` uses a single `namespace` string per instance — this is the i18next resource namespace under which all keys are stored:

```ts
import { createI18n } from "@domphy/i18n"

const i18n = createI18n<"en" | "fr", typeof en>({
  globalKey: "__myapp_i18n__",
  namespace: "app",   // all keys stored under this namespace
  locales: { en, fr },
  defaultLocale: "en",
})
```

## Splitting by feature with separate instances

For large apps with distinct translation domains, create one `createI18n` instance per domain and give each a unique `globalKey` and `namespace`:

```ts
import { createI18n } from "@domphy/i18n"
import enCommon from "./locales/en/common.json"
import enAuth from "./locales/en/auth.json"
import frCommon from "./locales/fr/common.json"
import frAuth from "./locales/fr/auth.json"

export const commonI18n = createI18n<"en" | "fr", typeof enCommon>({
  globalKey: "__app_common__",
  namespace: "common",
  locales: { en: enCommon, fr: frCommon },
  defaultLocale: "en",
})

export const authI18n = createI18n<"en" | "fr", typeof enAuth>({
  globalKey: "__app_auth__",
  namespace: "auth",
  locales: { en: enAuth, fr: frAuth },
  defaultLocale: "en",
})

// Initialize both upfront (or lazily per route)
await Promise.all([commonI18n.initI18n(), authI18n.initI18n()])
```

Each instance manages its own locale state. If you want them to stay in sync, call `setLocale` on all:

```ts
async function setAppLocale(locale: "en" | "fr") {
  await Promise.all([commonI18n.setLocale(locale), authI18n.setLocale(locale)])
  localStorage.setItem("locale", locale)
}
```

## Route-based lazy loading

Initialize a namespace instance in a route loader instead of at app startup:

```ts
import { createRoute } from "@domphy/router"
import { createI18n } from "@domphy/i18n"

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  loader: async () => {
    const { default: en } = await import("./locales/en/dashboard.json")
    const { default: fr } = await import("./locales/fr/dashboard.json")

    const dashboardI18n = createI18n<"en" | "fr", typeof en>({
      globalKey: "__app_dashboard__",
      namespace: "dashboard",
      locales: { en, fr },
      defaultLocale: "en",
    })
    await dashboardI18n.initI18n(commonI18n.getLocale())
    return dashboardI18n
  },
  component: DashboardPage,
})
```

## Translation file structure

Both flat and nested key structures work — access nested keys with dot notation:

```json
// Flat:
{
  "loginTitle": "Sign in",
  "loginEmail": "Email address"
}
```

```json
// Nested:
{
  "login": {
    "title": "Sign in",
    "fields": { "email": "Email address" }
  }
}
```

```ts
t("login.title")         // nested
t("loginTitle")          // flat
```

## TypeScript typed keys

Pass your translation object as the second generic parameter — keys are flattened to dot-notation strings at compile time:

```ts
import type en_auth from "./locales/en/auth.json"

const authI18n = createI18n<"en" | "fr", typeof en_auth>({ ... })
const { t } = authI18n

t("login.title")          // ✓ type-checked
t("login.fields.email")   // ✓
t("nonexistent")          // ✗ TypeScript error
```
