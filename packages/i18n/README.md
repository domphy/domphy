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
| `addLocale` | `(locale, messages) → Promise<void>` | Register a locale after `createI18n` (on-demand `await import()` loading) |

Module export `runWithI18n(fn)` — fresh request-locale scope (SSR). No-op on the client.

`createI18n`'s `locales` is snapshotted at init, so a locale the app did not ship up front goes in through `addLocale` (an `addResourceBundle` wrapper: deep-merges, overwrites repeated keys, initializes i18next first if needed). It re-renders mounted `t(listener, key)` readers even when the locale code does not change — booting at a locale whose data has not arrived leaves i18next already on that code serving the fallback, so `setLocale` alone short-circuits. Added locales live on the shared `globalKey` store, so sibling instances from a chunk-split bundle see them too. Declare the full `TLocale` union up front — only the data is deferred.

`createI18n` also accepts an optional `interpolation: { escapeValue?: boolean }` — it defaults to **`false`**, unlike bare i18next. Domphy is the escaping boundary: a string child is always rendered as TEXT, so `ElementNode.generateHTML()` turns `O'Brien & Tom <3` into `O&#39;Brien &amp; Tom &lt;3` on its own. Leaving i18next's escaping on would escape every interpolated value twice and the reader would see the entity source (`1&#x2F;2&#x2F;2026`, `O&#39;Brien`) instead of the characters — the same reason react-i18next ships `escapeValue: false`. Pass `true` only when a translated string is handed to something that parses HTML and does not sanitize.

On the server, `initI18n` / `setLocale` do not mutate the shared `globalThis` store's language. The request locale is stored in `AsyncLocalStorage`, so two concurrent `initI18n("en")` and `initI18n("vi")` calls do not clobber each other. The client still dedups via `globalThis[globalKey]`. Node HTTP already isolates requests; wrap other SSR entry points with `runWithI18n()`.

See the [full API reference](https://domphy.com/docs/i18n/api) for details.
