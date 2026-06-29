# @domphy/i18n

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/i18n/) · [npm](https://www.npmjs.com/package/@domphy/i18n)

Reactive i18next wrapper for Domphy. When the locale changes, any UI element that called `t(listener, key)` re-renders automatically — no manual subscriptions.

## Install

```bash
npm install @domphy/i18n i18next
```

`@domphy/core` is a peer dependency.

## Quick start

```ts
import { createI18n } from "@domphy/i18n"

const en = { hello: "Hello, {{name}}!", save: "Save" } as const

const i18n = createI18n<"en" | "vi", typeof en>({
  globalKey: "__myapp_i18n__",  // unique per app; deduplicates across Vite chunks + SSR
  namespace: "app",
  locales: {
    en,
    vi: { hello: "Xin chào, {{name}}!", save: "Lưu" },
  },
  defaultLocale: "en",
})

await i18n.initI18n()
```

## Reactive usage

```ts
const { t, setLocale, getLocale } = i18n

// Reactive — re-renders when setLocale() is called
const Greeting = {
  p: (l) => t(l, "hello", { name: "World" }),
}

// Non-reactive (outside element tree)
const label = t("save")
```

## Locale switching

```ts
await setLocale("vi")
console.log(getLocale()) // "vi"
```

All elements using `t(listener, key)` re-render automatically.

## Locale detection

```ts
const detected = i18n.detectLocale({ pathSegment: true })
await i18n.initI18n(detected)
```

Priority: URL path prefix (`/vi/...`) → localStorage key → `defaultLocale`.

## Type-safe keys

Pass your translation object as a generic to get full key inference:

```ts
const { t } = createI18n<"en" | "fr", typeof en>({ ... })

t("hello")        // ✓
t("nav.missing")  // ✗ TypeScript error
```

## API

| Member | Signature | Description |
|---|---|---|
| `t` | `(key, opts?) → string` | Static translation |
| `t` | `(listener, key, opts?) → string` | Reactive translation |
| `locale` | `State<TLocale>` | Reactive locale state |
| `currentLocale` | `(listener) → TLocale` | Reactive locale code (sugar for `locale.get(listener)`) |
| `exists` | `(key) → boolean` | Check key presence in active locale |
| `initI18n` | `(locale?) → Promise<void>` | Initialize i18next |
| `setLocale` | `(locale) → Promise<void>` | Switch locale, trigger re-renders |
| `getLocale` | `() → TLocale` | Current locale (non-reactive) |
| `detectLocale` | `(opts?) → TLocale` | Detect locale from URL/localStorage |

See the [full API reference](https://domphy.com/docs/i18n/api) for details.
