---
title: "Namespaces"
description: "Split translations into multiple files by feature or domain to keep bundles small and maintainable."
---

# Namespaces

## What are namespaces?

Namespaces let you split translations into separate files. Instead of one large translation object, each feature or section has its own file:

```
translations/
  en/
    common.json      ← shared strings (buttons, labels)
    auth.json        ← login/signup pages
    dashboard.json   ← dashboard feature
    errors.json      ← error messages
  fr/
    common.json
    auth.json
    ...
```

## Defining namespaces

Pass a namespace map when creating the i18n instance. Each namespace is lazily loaded:

```ts
import { createI18n } from "@domphy/i18n/domphy"

const { t, setLocale } = createI18n({
  locale: "en",
  namespaces: {
    common:    () => import(`./translations/en/common.json`),
    auth:      () => import(`./translations/en/auth.json`),
    dashboard: () => import(`./translations/en/dashboard.json`),
  },
  defaultNs: "common",   // used when no namespace is specified
})
```

## Using namespaces in translations

Prefix the key with `namespace:`:

```ts
t("common:save")               // key "save" from common namespace
t("auth:login.title")          // key "login.title" from auth namespace
t("dashboard:widgets.count")   // key "widgets.count" from dashboard namespace
t("save")                      // uses defaultNs "common"
```

## Dynamic locale + namespace loading

Load the right namespace files for the active locale:

```ts
import { createI18n } from "@domphy/i18n/domphy"
import { toState } from "@domphy/core"

const locale = toState<"en" | "fr">("en")

const { t, setLocale } = createI18n({
  locale: locale.get(),
  namespaces: {
    common:    async () => {
      const l = locale.get()
      return import(`./translations/${l}/common.json`)
    },
    dashboard: async () => {
      const l = locale.get()
      return import(`./translations/${l}/dashboard.json`)
    },
  },
})

locale.subscribe((newLocale) => setLocale(newLocale))
```

Bundlers (Vite, Rollup) can statically analyze `import(`./translations/${l}/common.json`)` and create per-locale chunks.

## Preloading namespaces

Load a namespace before it's needed (e.g. before a route renders):

```ts
import { preloadNamespace } from "@domphy/i18n"

// Before navigating to the dashboard
async function navigateToDashboard() {
  await preloadNamespace("dashboard")
  router.navigate({ to: "/dashboard" })
}
```

## Namespace fallback

If a key is missing in the active namespace, fall back to `common`:

```ts
const { t } = createI18n({
  locale: "en",
  namespaces: { common: ..., auth: ... },
  defaultNs: "common",
  fallbackNs: "common",   // try "common" if key not found in current ns
})

t("auth:some.missing.key")   // not in auth → tries common → falls back to key name
```

## Translation file structure

Keep namespace files flat or nested — both work:

```json
// Flat (easier to search):
{
  "loginTitle": "Sign in to your account",
  "loginEmail": "Email address",
  "loginPassword": "Password",
  "loginSubmit": "Sign in"
}
```

```json
// Nested (easier to browse):
{
  "login": {
    "title": "Sign in to your account",
    "fields": {
      "email": "Email address",
      "password": "Password"
    },
    "submit": "Sign in"
  }
}
```

Access nested keys with dot notation: `t("auth:login.fields.email")`.

## TypeScript typed namespaces

Define types for your translation keys to get autocomplete and catch missing keys at compile time:

```ts
import type en_common from "./translations/en/common.json"
import type en_auth from "./translations/en/auth.json"

declare module "@domphy/i18n" {
  interface TranslationMap {
    common:    typeof en_common
    auth:      typeof en_auth
  }
}

// Now t() is fully typed with autocomplete
t("common:save")   // ✓
t("auth:login.title")   // ✓
t("common:nonexistent")   // ✗ TypeScript error
```
